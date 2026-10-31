import {checkpointNotice,arrivalNotice} from './notices';
import {speakNotice,stopVoice,testVoice} from './speech';
import {advanceComparison,arrivalReady,courseModel,initialComparison} from './comparison';
import {checkpointsFor} from './checkpoints';
import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Alert,Pressable,ScrollView,Text,View} from 'react-native';
import {RouteMap} from './RouteMap';
import {appStyles as s} from './design';
import {appendFix,ghostAt,clock,length,type Run,type Point,type TravelMode} from './core';
import {advanceSimulation,newSimulation,SIMULATION_STEPS,simulationPoint,type Signal} from './simulation';
function Control({label,onPress,selected=false,disabled=false}:{label:string;onPress:()=>void;selected?:boolean;disabled?:boolean}){
  return <Pressable accessibilityRole="button" accessibilityState={{selected,disabled}} disabled={disabled} onPress={onPress} style={[s.button,selected?s.tabActive:s.secondary,{opacity:disabled ? 0.4 : 1}]}><Text style={[s.buttonText,s.lightText]}>{label}</Text></Pressable>;
}
export function Simulator({onClose,origin}:{onClose:()=>void;origin?:Point}){
  const [mode,setMode]=useState<TravelMode>('driving');
  const [voiceEnabled,setVoiceEnabled]=useState(false);
  const voiceSession=useRef(0),lastNotice=useRef<string|undefined>(undefined);
  const [referenceRate,setReferenceRate]=useState(1);
  const model=useMemo(()=>{const points=Array.from({length:SIMULATION_STEPS+1},(_,index)=>{const point=simulationPoint(index,origin);return {...point,timestamp:simulationPoint(0,origin).timestamp+index*1000*referenceRate};});const reference:Run={id:'simulation-reference',routeId:'simulation',name:'Referencia simulada',mode:'driving',points,startedAt:points[0].timestamp,endedAt:points.at(-1)!.timestamp};return courseModel(reference,2);},[origin,referenceRate]);
  const controls=useMemo(()=>checkpointsFor(model.reference.points,2).points,[model]);
  const [session,setSession]=useState<{step:number;run:Run}>(()=>({step:0,run:{...newSimulation('driving',origin),comparison:initialComparison(simulationPoint(0,origin).timestamp)}}));
  const {run,step}=session;
  const [playing,setPlaying]=useState(false),[rate,setRate]=useState(1),[locked,setLocked]=useState(false);
  const [signal,setSignal]=useState<Signal>('good');
  const advance=useCallback((amount=1)=>{
    setSession(previous=>{
      const next=Math.min(SIMULATION_STEPS,previous.step+amount);
      let updated=previous.run;
      for(let index=previous.step+1;index<=next;index++){
        const before=updated;updated=advanceSimulation(updated,index,signal,origin);
        if(updated.lastFixAt!==before.lastFixAt){updated={...updated,comparison:advanceComparison(model,before.comparison??initialComparison(before.startedAt),simulationPoint(index,origin),before.startedAt)};const crossed=updated.comparison!.splits.slice(before.comparison?.splits.length??0).filter(split=>split.meters<model.total-0.01);if(crossed.length)updated.notice=checkpointNotice(updated,crossed.at(-1)!,simulationPoint(index,origin).timestamp);}
      }
      return {step:next,run:updated};
    });
  },[signal,origin,model]);
  useEffect(()=>{
    if(!playing||step>=SIMULATION_STEPS)return;
    const timer=setInterval(()=>advance(),1000/rate);
    return()=>clearInterval(timer);
  },[playing,rate,step,advance]);
  useEffect(()=>{
    if(!voiceEnabled){lastNotice.current=run.notice?.id;void stopVoice();return;}
    if(!run.notice||lastNotice.current===run.notice.id)return;
    lastNotice.current=run.notice.id;
    void speakNotice({...run.notice,id:`test-${voiceSession.current}-${run.notice.id}`,createdAt:Date.now()},true);
  },[run.notice,voiceEnabled]);
  useEffect(()=>()=>{void stopVoice();},[]);
  function reset(nextMode=mode){voiceSession.current++;lastNotice.current=undefined;void stopVoice();setPlaying(false);setMode(nextMode);setSignal('good');setSession({step:0,run:{...newSimulation(nextMode,origin),comparison:initialComparison(simulationPoint(0,origin).timestamp)}});}
  if(locked)return <View style={{flex:1,backgroundColor:'#000',justifyContent:'center',padding:24,gap:20}}><Text style={s.title}>Pantalla bloqueada simulada</Text><Text style={s.muted}>La prueba sigue registrando en memoria si estaba en marcha. Esto no bloquea Android ni reproduce sus restricciones de batería.</Text><Control label="Desbloquear simulación" onPress={()=>setLocked(false)}/></View>;
  return <View style={{flex:1}}>
    <View style={{paddingHorizontal:18,paddingBottom:12,gap:8}}><Text style={s.title}>Simulador</Text><Text style={s.warning}>DATOS DE PRUEBA · No usa el GPS ni guarda rutas o récords.</Text></View>
    <View style={[s.mapArea,{flex:.8}]}><RouteMap points={run.points} recording checkpoints={controls} ghost={run.comparison&&!run.comparison.unavailable&&simulationPoint(step,origin).timestamp-(run.lastFixAt??run.startedAt)<=15000?ghostAt(model.reference,step*1000):undefined}/></View>
    <ScrollView style={{flex:1}} contentContainerStyle={s.content}>
      <Text style={s.muted}>Circuito ficticio de unos 3 km. Comprueba curvas, puntos rechazados y cortes sin salir de casa. No representa una carretera calculada.</Text>
      <Text style={s.playTime}>{clock(step*1000)} / 03:00 · {(length(run.points)/1000).toFixed(2)} km</Text>
      <Text style={s.caption}>{run.points.length} puntos guardados · {run.rejectedFixes??0} rechazados · {run.gpsGaps??0} cortes detectados al recuperar señal</Text>
      <View style={s.card}><Text style={s.cardTitle}>Comparación simulada</Text><Text style={s.muted}>{run.comparison?.difference==null||run.comparison.unavailable||simulationPoint(step,origin).timestamp-(run.lastFixAt??run.startedAt)>15000?'Comparación no disponible':`Diferencia: ${(run.comparison.difference/1000).toFixed(1)} s`}</Text><Text style={s.caption}>{run.comparison?.splits.length??0} controles cruzados · {run.autoCompleted?'Llegada confirmada':'Sin llegada confirmada'}</Text></View>
      <View style={s.row}>{[[0.9,'Referencia más rápida'],[1,'Mismo ritmo'],[1.1,'Referencia más lenta']].map(([value,label])=><View key={String(value)} style={{flex:1}}><Control label={String(label)} selected={referenceRate===value} onPress={()=>{setReferenceRate(Number(value));reset();}}/></View>)}</View>
      {step===SIMULATION_STEPS&&<Control label="Confirmar llegada (5 s)" onPress={()=>{setSession(previous=>{const point={...simulationPoint(SIMULATION_STEPS,origin),timestamp:previous.run.lastFixAt!+5000};const comparison=advanceComparison(model,previous.run.comparison??initialComparison(previous.run.startedAt),point,previous.run.startedAt);const completed:Run={...appendFix(previous.run,point),comparison,referenceId:model.reference.id,autoCompleted:arrivalReady(comparison,point.timestamp)};if(completed.autoCompleted){completed.endedAt=point.timestamp;completed.notice=arrivalNotice(completed,model.reference);}return {...previous,run:completed};});}}/>}
      {run.notice&&<View accessibilityLiveRegion="polite" style={s.card}><Text style={s.cardTitle}>{run.notice.title}</Text><Text style={s.muted}>{run.notice.message}</Text></View>}
      <Control label={voiceEnabled?'Silenciar voz de prueba':'Activar voz de prueba'} selected={voiceEnabled} onPress={()=>setVoiceEnabled(value=>!value)}/>
      <Control label="Probar aviso de voz" onPress={()=>{void testVoice().then(ok=>{if(!ok)Alert.alert('Prueba de voz','Android no ha confirmado el inicio de la voz. Prueba el ejemplo en Ajustes del móvil → Texto a voz. Si allí funciona, el fallo está en la app.');});}}/>
      <Control label={playing&&step<SIMULATION_STEPS?'Pausar simulación':step>=SIMULATION_STEPS?'Simulación terminada':'Iniciar simulación'} disabled={step>=SIMULATION_STEPS} onPress={()=>setPlaying(value=>!value)}/>
      <View style={s.row}>{([1,5,10] as const).map(value=><View key={value} style={{flex:1}}><Control label={`${value}×`} selected={rate===value} onPress={()=>setRate(value)}/></View>)}</View>
      <Control label="Avanzar 10 segundos" disabled={step>=SIMULATION_STEPS} onPress={()=>advance(10)}/>
      <Control label="Simular bloqueo de pantalla" onPress={()=>setLocked(true)}/>
      <Text style={s.sectionTitle}>Señal GPS simulada</Text>
      {([['good','Buena señal'],['weak','Señal imprecisa'],['lost','Sin señal']] as const).map(([value,label])=><Control key={value} label={label} selected={signal===value} onPress={()=>setSignal(value)}/>)}
      <Text style={s.sectionTitle}>Filtro de movimiento</Text>
      <Text style={s.caption}>El circuito circula a unos 63 km/h. El filtro a pie lo rechazará; el de coche permite registrarlo. Cambiar modo reinicia la prueba.</Text>
      <Control label="En coche" selected={mode==='driving'} onPress={()=>reset('driving')}/><Control label="A pie" selected={mode==='walking'} onPress={()=>reset('walking')}/>
      <Control label="Reiniciar simulador" onPress={()=>reset()}/><Control label="Salir del simulador" onPress={onClose}/>
      <Text style={s.footnote}>No reproduce las restricciones de batería del POCO ni sustituye una prueba real de ubicación.</Text>
    </ScrollView>
  </View>;
}

