import { t as tr } from './i18n-core';
import React,{useState} from 'react';
import {decimal} from './format';
import {Pressable,Text,View} from 'react-native';
import type {Run} from './core';
import {clock,duration} from './core';
import {appStyles as s} from './design';
type Props={attempts:Run[];choice?:string;autoFinish:boolean;voiceEnabled?:boolean;onTestVoice?:()=>void;disabled:boolean;reference?:Run;onChange:(change:{referenceChoice?:string;autoFinish?:boolean;voiceEnabled?:boolean})=>void};
export function ReferenceSettings({attempts,choice='latest',autoFinish,voiceEnabled=true,onTestVoice,disabled,reference,onChange}:Props){
  const [dates,setDates]=useState(false),[limit,setLimit]=useState(10);
  return <View style={s.card}><Text style={s.cardTitle}>{tr("Comparar con")}</Text>
    <View style={s.row}>{[['latest','Último viaje'],['best','Mejor tiempo']].map(([value,label])=><Pressable key={value} disabled={disabled} accessibilityRole="radio" accessibilityState={{checked:choice===value,disabled}} onPress={()=>onChange({referenceChoice:value})} style={[s.tab,choice===value&&s.tabActive]}><Text style={choice===value?s.tabSelected:s.caption}>{label}</Text></Pressable>)}</View>
    <Text style={s.caption}>{reference?`${new Date(reference.startedAt).toLocaleString('es-ES')} · ${clock(duration(reference))}`:'No hay una referencia fiable disponible en este modo.'}</Text>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:dates,disabled}} disabled={disabled} onPress={()=>setDates(value=>!value)} style={s.optionsLink}><Text style={s.tabSelected}>{dates?'Ocultar viajes':'Elegir un viaje concreto'}</Text></Pressable>
    {dates&&<>{[...attempts].sort((a,b)=>b.startedAt-a.startedAt).slice(0,limit).map(attempt=><Pressable key={attempt.id} disabled={disabled} accessibilityRole="radio" accessibilityLabel={`Referencia ${new Date(attempt.startedAt).toLocaleString('es-ES')}`} accessibilityState={{checked:choice===attempt.id,disabled}} onPress={()=>onChange({referenceChoice:attempt.id})} style={[s.tab,choice===attempt.id&&s.tabActive]}><Text style={s.lightText}>{new Date(attempt.startedAt).toLocaleString('es-ES')} · {clock(duration(attempt))}</Text></Pressable>)}{attempts.length>limit&&<Pressable accessibilityRole="button" onPress={()=>setLimit(value=>value+10)} style={s.optionsLink}><Text style={s.tabSelected}>{tr("Mostrar más viajes")}</Text></Pressable>}</>}
    <Pressable accessibilityRole="switch" accessibilityLabel={tr("Guardar automáticamente al llegar")} accessibilityState={{checked:autoFinish,disabled}} disabled={disabled} onPress={()=>onChange({autoFinish:!autoFinish})} style={s.screenSetting}><Text style={[s.lightText,{flex:1}]}>{tr("Guardar automáticamente al llegar")}</Text><Text style={s.tabSelected}>{autoFinish?'Sí':'No'}</Text></Pressable>
    <Pressable accessibilityRole="switch" accessibilityLabel={tr("Avisos de voz en puntos de control")} accessibilityState={{checked:voiceEnabled,disabled}} disabled={disabled} onPress={()=>onChange({voiceEnabled:!voiceEnabled})} style={s.screenSetting}><Text style={[s.lightText,{flex:1}]}>{tr("Voz en controles y llegada")}</Text><Text style={s.tabSelected}>{voiceEnabled?'Sí':'No'}</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onTestVoice} style={[s.button,s.secondary]}><Text style={s.lightText}>{tr("Probar voz")}</Text></Pressable>
    <Text style={s.caption}>{tr('Guarda al estar parado cinco segundos en la zona del destino: hasta 150 m, reducida en rutas cortas. También puedes finalizar manualmente desde cualquier lugar.')}</Text>
  </View>;
}
export function SplitSummary({run}:{run:Run}){
  const splits=run.comparison?.splits??[];
  if(!splits.length)return null;
  return <View style={s.card}><Text style={s.cardTitle}>{tr("Tiempos por tramos")}</Text><Text style={s.caption}>{tr("Incluyen paradas y tráfico. Comparados con la referencia elegida.")}</Text>{splits.map((split,index)=>{
    const previousElapsed=index?splits[index-1].elapsed:0,previousReference=index?splits[index-1].referenceElapsed:0;
    const elapsed=split.elapsed!==null&&previousElapsed!==null?split.elapsed-previousElapsed:null;
    const reference=split.referenceElapsed-previousReference;
    const difference=elapsed===null?null:elapsed-reference;
    return <View key={split.meters} style={s.attempt}><View style={{flex:1,gap:5}}><Text style={s.lightText}>{index===splits.length-1&&run.endedAt?'Meta':`Km ${decimal(split.meters/1000,1)}`}</Text><Text style={s.caption}>{difference===null?'Sin comparación fiable':difference===0?'Mismo tiempo':`${decimal(Math.abs(difference)/1000,1)} s ${difference<0?'menos':'más'} en este tramo`}</Text></View><Text style={s.playTime}>{elapsed===null?'—':clock(elapsed)}</Text></View>;
  })}</View>;
}
