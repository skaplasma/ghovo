import React from 'react';
import {Text,View} from 'react-native';
import type {Run, TravelMode} from './core';
import {t} from './i18n-core';
import {tripFacts} from './results';
import {appStyles as s} from './design';

// modeLabel se usa también fuera de componentes (tarjetas, informes), así que traduce con
// el idioma activo en ese momento en vez de con un hook.
export function modeLabel(mode?: TravelMode): string {
  switch (mode) {
    case 'driving': return t('mode.driving');
    case 'bicycling': return t('mode.bicycling');
    case 'running': return t('mode.running');
    case 'walking': return t('mode.walking');
    default: return t('mode.none');
  }
}

export function formatPace(speedKmh: number | null): string {
  if (!speedKmh || speedKmh <= 0) return t('common.unavailable');
  const paceMinutes = 60 / speedKmh;
  const mins = Math.floor(paceMinutes);
  const secs = Math.round((paceMinutes - mins) * 60);
  return `${mins}'${secs.toString().padStart(2, '0')}" /km`;
}

const time=(value:number|undefined)=>value===undefined?'—':new Date(value).toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});
function Fact({label,value}:{label:string;value:string}){
  return <View style={{flex:1,minWidth:120,gap:5}}><Text style={s.caption}>{label}</Text><Text style={[s.lightText,{fontSize:18,fontWeight:'700'}]}>{value}</Text></View>;
}
export function TripDetails({run}:{run:Run}){
  const facts=tripFacts(run);
  return <View style={{gap:16}}>
    <Text style={s.sectionTitle}>{t('trip.title')}</Text>
    <View style={s.row}><Fact label={t('trip.start')} value={time(run.startedAt)}/><Fact label={t('trip.end')} value={time(run.endedAt)}/></View>
    <View style={s.row}>
      {run.mode === 'running' ? (
        <Fact label={t('trip.averagePace')} value={facts.averageSpeed === null ? t('common.unavailable') : formatPace(facts.averageSpeed)}/>
      ) : (
        <Fact label={t('trip.averageSpeed')} value={facts.averageSpeed===null?t('common.unavailable'):`${facts.averageSpeed.toFixed(1)} km/h`}/>
      )}
      <Fact label={t('trip.mode')} value={modeLabel(run.mode)}/>
    </View>
    <Text style={s.caption}>{t('trip.caption')}</Text>
    <View style={s.row}><Fact label={t('trip.accuracy')} value={facts.accuracy===null?t('trip.noData'):`±${Math.round(facts.accuracy)} m`}/><Fact label={t('trip.gaps')} value={String(facts.gaps)}/></View>
    <Text style={s.caption}>{t('trip.accuracyCaption')}</Text>
  </View>;
}
