import React from 'react';
import {Text,View} from 'react-native';
import type {Run, TravelMode} from './core';
import {tripFacts} from './results';
import {appStyles as s} from './design';

export function modeLabel(mode?: TravelMode): string {
  switch (mode) {
    case 'driving': return 'En coche';
    case 'bicycling': return 'En bici';
    case 'running': return 'Corriendo';
    case 'walking': return 'A pie';
    default: return 'Sin especificar';
  }
}

export function formatPace(speedKmh: number | null): string {
  if (!speedKmh || speedKmh <= 0) return 'No disponible';
  const paceMinutes = 60 / speedKmh;
  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);
  return `${mins}'${secs.toString().padStart(2, '0')}" /km`;
}

const time=(value:number|undefined)=>value===undefined?'—':new Date(value).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
function Fact({label,value}:{label:string;value:string}){
  return <View style={{flex:1,minWidth:120,gap:5}}><Text style={s.caption}>{label}</Text><Text style={[s.lightText,{fontSize:18,fontWeight:'700'}]}>{value}</Text></View>;
}
export function TripDetails({run}:{run:Run}){
  const facts=tripFacts(run);
  return <View style={{gap:16}}>
    <Text style={s.sectionTitle}>Información del viaje</Text>
    <View style={s.row}><Fact label="Salida" value={time(run.startedAt)}/><Fact label="Llegada" value={time(run.endedAt)}/></View>
    <View style={s.row}>
      {run.mode === 'running' ? (
        <Fact label="Ritmo medio" value={facts.averageSpeed === null ? 'No disponible' : formatPace(facts.averageSpeed)}/>
      ) : (
        <Fact label="Velocidad media" value={facts.averageSpeed===null?'No disponible':`${facts.averageSpeed.toFixed(1)} km/h`}/>
      )}
      <Fact label="Modo de viaje" value={modeLabel(run.mode)}/>
    </View>
    <Text style={s.caption}>El tiempo total y la velocidad media incluyen las paradas. Si el trazado está incompleto, no se calcula la media.</Text>
    <View style={s.row}><Fact label="Precisión GPS estimada" value={facts.accuracy===null?'Sin datos':`±${Math.round(facts.accuracy)} m`}/><Fact label="Interrupciones GPS" value={String(facts.gaps)}/></View>
    <Text style={s.caption}>Precisión media de las posiciones guardadas, no una medida del error real.</Text>
  </View>;
}
