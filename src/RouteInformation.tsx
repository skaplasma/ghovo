import React,{useMemo,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {clock,type Run} from './core';
import {routeFacts} from './results';
import {appStyles as s} from './design';
import {modeLabel} from './TripDetails';

const date=(timestamp:number|null)=>timestamp===null?'Sin viajes':new Date(timestamp).toLocaleString('es-ES',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
function Item({label,value}:{label:string;value:string}){
  return <View style={{flex:1,minWidth:100,gap:5}}><Text style={s.caption}>{label}</Text><Text style={s.lightText}>{value}</Text></View>;
}
export function RouteInformation({reference,attempts}:{reference:Run;attempts:Run[]}){
  const [expanded,setExpanded]=useState(false);
  const facts=useMemo(()=>routeFacts(reference,attempts),[reference,attempts]);
  return <View style={{gap:12}}>
    <Pressable accessibilityRole="button" accessibilityLabel="Información de la ruta" accessibilityState={{expanded}} onPress={()=>setExpanded(value=>!value)} style={[s.secondary,{minHeight:48,padding:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}]}>
      <Text style={s.lightText}>Información de la ruta · {facts.count} {facts.count===1?'viaje':'viajes'}</Text><Text style={s.tabSelected}>{expanded?'−':'+'}</Text>
    </Pressable>
    {expanded&&<View style={[s.card,{gap:16}]}>
      <Text style={s.cardTitle}>Tu historial en esta ruta</Text>
      <View style={s.row}><Item label="Tiempo habitual" value={facts.typical===null?'Sin datos suficientes':clock(facts.typical)}/><Item label="Mejor tiempo guardado" value={facts.best===null?'Sin datos suficientes':clock(facts.best)}/></View>
      <Text style={s.caption}>Tiempo habitual: mediana de {facts.validCount} {facts.validCount===1?'viaje válido':'viajes válidos'}. Incluye paradas. Los viajes con cortes GPS o datos insuficientes quedan fuera del cálculo de tiempos.</Text>
      <View style={s.row}><Item label="Viajes completados" value={String(facts.count)}/><Item label="Distancia acumulada" value={`${(facts.meters/1000).toFixed(2)} km`}/></View>
      <Text style={s.caption}>La distancia suma los trazados registrados; puede ser incompleta si hubo cortes.</Text>
      <Item label="Primer viaje guardado" value={date(facts.first)}/><Item label="Última salida guardada" value={date(facts.latest)}/>
      <Item label="Modo de esta ruta" value={modeLabel(reference.mode)}/>
      <Text style={s.caption}>Solo incluye esta ruta y este modo de viaje.</Text>
    </View>}
  </View>;
}
