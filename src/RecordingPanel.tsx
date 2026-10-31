import {GpsDiagnostics} from './GpsDiagnostics';
import React,{useEffect,useRef,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {clock,type Run} from './core';
import {appStyles as s} from './design';
type Props={run:Run;now:number;distance:string;serviceRunning:boolean;keepScreenOn:boolean;onToggleScreen:()=>void;onRecover:()=>void;onHelp:()=>void;onDiscard:()=>void;disabled:boolean;comparisonReference?:Run;onToggleVoice?:()=>void};
export function RecordingPanel({run,now,distance,serviceRunning,keepScreenOn,onToggleScreen,onRecover,onHelp,onDiscard,disabled,comparisonReference,onToggleVoice}:Props){
  const [options,setOptions]=useState(false);
  const age=Math.max(0,Math.floor((now-(run.lastFixAt??run.points.at(-1)?.timestamp??run.startedAt))/1000));
  const stale=age>15;
  const needsAttention=!serviceRunning||stale||!!run.error;
  const hadLoss=useRef(false);
  const [recovered,setRecovered]=useState(false);
  useEffect(()=>{
    if(needsAttention){hadLoss.current=true;return;}
    if(!hadLoss.current)return;
    const show=setTimeout(()=>setRecovered(true),0);
    const hide=setTimeout(()=>setRecovered(false),5000);
    return()=>{clearTimeout(show);clearTimeout(hide);};
  },[needsAttention]);
  const title=!serviceRunning?'Grabación interrumpida':stale?'Buscando una posición precisa':run.error?'Revisar señal GPS':'Grabación activa';
  return <>
    {!!run.referenceOffsetMs&&<Text style={s.caption}>Tiempo desde tu incorporación. El fantasma parte del mismo punto; este tramo no sustituye el récord A→B completo.</Text>}
    {!!run.referenceId&&!run.circuitStartedAt&&<Text style={[s.caption,{color:'#82E0AA'}]}>Grabación activa hacia el circuito. El fantasma empezará al entrar en el trazado.</Text>}
    <View style={[s.recordHeading,{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}]}><Text style={s.eyebrow}>{run.mode==='driving'?'EN COCHE':run.mode==='walking'?'A PIE':'TU RECORRIDO'}</Text><Text style={[s.recordTitle,{fontSize:18,flexShrink:1}]} numberOfLines={1}>{run.name}</Text></View>
    {options&&run.referenceId&&<View style={[s.card,{padding:12,gap:6}]}><Text style={s.eyebrow}>COMPARACIÓN EN DIRECTO</Text><Text style={s.cardTitle}>{needsAttention||run.comparison?.unavailable||run.comparison?.difference==null?'Comparación no disponible':run.comparison.difference===0?'Mismo tiempo en este punto':`Llevas ${(Math.abs(run.comparison.difference)/1000).toFixed(0)} s ${run.comparison.difference<0?'menos':'más'} en este punto`}</Text><Text style={s.caption}>{comparisonReference?`Referencia: ${new Date(comparisonReference.startedAt).toLocaleString('es-ES')}`:'Buscando referencia guardada'}</Text>{!!run.comparison?.splits.length&&<Text style={s.caption}>Último control · Km {(run.comparison.splits.at(-1)!.meters/1000).toFixed(1)}</Text>}</View>}
    <View style={s.recordMetrics}>
      <View style={{flex:1.25,gap:8}}><Text style={s.caption}>{run.referenceId&&run.circuitStartedAt?'Tiempo en ruta':'Tiempo'}</Text><Text style={s.recordTime} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{clock(Math.max(0,now-(run.circuitStartedAt??run.startedAt)))}</Text></View>
      <View style={s.recordMetricDivider}/>
      <View style={{flex:1,gap:8}}><Text style={s.caption}>Distancia</Text><Text style={s.recordDistance} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>{distance}</Text></View>
    </View>
    <View style={[s.signalCard,needsAttention&&s.signalAttention]}>
      <View style={[s.signalDot,{backgroundColor:needsAttention?'#F4CCA0':'#C0ED8B'}]}/>
      <View style={{flex:1,gap:4}}><Text accessibilityLiveRegion="polite" style={s.signalTitle}>{title}</Text><Text style={s.caption}>{!serviceRunning?'El servicio GPS está detenido. El tiempo sigue contando.':stale?`Última posición válida hace ${age} s.`:`✓ Precisión estimada: ±${Math.round(run.lastAccuracy??run.points.at(-1)?.accuracy??25)} m · guardando posiciones.`}</Text></View>
    </View>
    {recovered&&!needsAttention&&<Text accessibilityLiveRegion="polite" style={s.tabSelected}>Señal GPS recuperada</Text>}
    {!!run.error&&<Text style={s.warning}>{run.error}</Text>}
    {needsAttention&&<Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}} onPress={onRecover} style={[s.button,s.secondary]}><Text style={s.lightText}>Recuperar señal GPS</Text></Pressable>}
    <Pressable accessibilityRole="switch" accessibilityLabel="Mantener pantalla encendida" accessibilityState={{checked:keepScreenOn,disabled}} disabled={disabled} onPress={onToggleScreen} style={s.screenSetting}>
      <Text style={s.lightText}>Pantalla encendida</Text><View style={[s.switchTrack,keepScreenOn&&s.switchTrackOn]}><View style={[s.switchKnob,keepScreenOn&&{alignSelf:'flex-end'}]}/></View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={options?'Ocultar opciones':'Opciones y ayuda'} accessibilityState={{expanded:options}} onPress={()=>setOptions(value=>!value)} style={s.optionsLink}><Text style={s.caption}>{options?'Ocultar opciones':'Opciones y ayuda'}</Text><Text style={s.caption}>{options?'−':'+'}</Text></Pressable>
    {options&&<View style={s.card}>
      <Pressable accessibilityRole="switch" accessibilityLabel="Avisos de voz durante la ruta" accessibilityState={{checked:run.voiceEnabled!==false,disabled}} disabled={disabled} onPress={onToggleVoice} style={s.screenSetting}><Text style={s.lightText}>Avisos de voz</Text><Text style={s.tabSelected}>{run.voiceEnabled===false?'No':'Sí'}</Text></Pressable>
      <GpsDiagnostics/>
      <Text style={s.caption}>Última posición válida: hace {age} s. {run.rejectedFixes??0} posiciones descartadas por precisión o saltos.</Text>
      <Text style={s.caption}>Puedes bloquear el móvil con su botón físico. La grabación está preparada para continuar en segundo plano; depende de los permisos y ajustes de batería.</Text>
      <Pressable accessibilityRole="button" onPress={onHelp} style={[s.button,s.secondary]}><Text style={s.lightText}>Ayuda con pantalla bloqueada</Text></Pressable>
      {!needsAttention&&<Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}} onPress={onRecover} style={[s.button,s.secondary]}><Text style={s.lightText}>Recuperar señal GPS</Text></Pressable>}
      <Pressable accessibilityRole="button" disabled={disabled} accessibilityState={{disabled}} onPress={onDiscard} style={[s.button,s.secondary]}><Text style={s.lightText}>Guardar para más tarde</Text></Pressable>
    </View>}
  </>;
}
