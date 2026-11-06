import { t as tr } from './i18n-core';
import React,{useState} from 'react';
import {decimal} from './format';
import {Pressable,Text,View} from 'react-native';
import {CHECKPOINT_INTERVALS,type CheckpointInterval, type checkpointsFor} from './checkpoints';
import {appStyles as s} from './design';
type Props={value?:CheckpointInterval|null;result:ReturnType<typeof checkpointsFor>;disabled:boolean;onChange:(value:CheckpointInterval|null)=>void};
export function CheckpointSettings({value,result,disabled,onChange}:Props){
  const [editing,setEditing]=useState(false);
  return <View style={s.card}>
    <View style={s.row}><View style={{flex:1,gap:4}}><Text style={s.cardTitle}>{tr("Puntos de control")}</Text><Text style={s.caption}>{value?`Cada ${value} km · ${result.points.length} ${result.points.length===1?'punto':'puntos'}`:'Sin puntos de control'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={tr("Editar puntos de control")} accessibilityState={{expanded:editing,disabled}} disabled={disabled} onPress={()=>setEditing(v=>!v)} style={[s.secondary,{minHeight:44,paddingHorizontal:12,justifyContent:'center'}]}><Text style={s.tabSelected}>{editing?'Cerrar':'Editar'}</Text></Pressable></View>
    {editing&&<><View accessibilityLabel={tr("Intervalo de puntos de control")} style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[null,...CHECKPOINT_INTERVALS].map(km=><Pressable key={km??'off'} accessibilityRole="radio" accessibilityState={{checked:(value??null)===km,disabled}} disabled={disabled} onPress={()=>onChange(km)} style={[s.tab,{flex:0,minWidth:72},(value??null)===km&&s.tabActive]}><Text style={(value??null)===km?s.tabSelected:s.caption}>{km?`${km} km`:'Sin puntos'}</Text></Pressable>)}</View><Text style={s.caption}>{tr("Se calculan sobre la distancia del trazado guardado. La meta no cuenta como punto de control.")}</Text></>}
    {value&&(result.unavailable?<Text style={s.warning}>{tr("No se pueden colocar puntos fiables en esta ruta. Revisa si tiene cortes GPS o elige un intervalo mayor.")}</Text>:<><Text style={s.caption}>{result.points.length?result.points.slice(0,10).map(p=>`Km ${p.meters/1000}`).join(' · ')+(result.points.length>10?' · …':''):'No hay puntos intermedios: la ruta no supera el intervalo elegido.'}</Text><Text style={s.caption}>Meta · {decimal(result.total/1000,2)} km</Text></>)}
  </View>;
}
