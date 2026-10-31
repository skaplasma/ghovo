import React,{useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {gpsEvents,gpsEventLabel,type GpsEvent} from './gps-diagnostics';
import {appStyles as s} from './design';
export function GpsDiagnostics(){
  const [events,setEvents]=useState<GpsEvent[]>(),[error,setError]=useState(false);
  return <View style={{gap:8}}><Pressable accessibilityRole="button" onPress={()=>{void gpsEvents().then(value=>{setEvents(value.slice(-12).reverse());setError(false);}).catch(()=>setError(true));}} style={s.optionsLink}><Text style={s.caption}>Ver diagnóstico GPS</Text></Pressable>
    {error&&<Text style={s.caption}>No se pudo leer el diagnóstico.</Text>}
    {events&&<View style={s.card}><Text style={s.caption}>Últimos eventos · solo en este móvil, sin coordenadas.</Text>{!events.length&&<Text style={s.caption}>Todavía no hay eventos GPS.</Text>}{events.map((event,index)=><Text key={`${event.at}-${index}`} style={s.caption}>{new Date(event.at).toLocaleTimeString('es-ES')} · {gpsEventLabel[event.code]??event.code}{event.accuracy!==undefined?` · ±${Math.round(event.accuracy)} m`:''}</Text>)}</View>}
  </View>;
}
