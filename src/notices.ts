import {duration,isComparable,type Run} from './core.ts';
import {t} from './i18n-core.ts';
import type {Split} from './comparison.ts';
export type RouteNotice={id:string;kind:'checkpoint'|'arrival'|'entry';title:string;message:string;createdAt:number};
// Los avisos se generan en la tarea de fondo, así que la traducción tiene que resolverse
// con el idioma activo, no con el del render de la pantalla.
const secondsText=(difference:number)=>{
  const seconds=Math.round(Math.abs(difference)/1000);
  return seconds===1?t('notice.secondsOne'):t('notice.seconds',{n:seconds});
};
const differenceText=(difference:number|null)=>difference===null?t('notice.noComparison'):Math.abs(difference)<500?t('notice.sameTime'):difference<0?t('notice.faster',{seconds:secondsText(difference)}):t('notice.slower',{seconds:secondsText(difference)});
export function checkpointNotice(run:Run,split:Split,createdAt:number):RouteNotice{
  const km=Number((split.meters/1000).toFixed(2)).toLocaleString('es-ES');
  return {id:`${run.id}:checkpoint:${split.meters}`,kind:'checkpoint',title:t('notice.checkpoint.title',{km}),message:t('notice.checkpoint.message',{km,difference:differenceText(split.difference)}),createdAt};
}
export function arrivalNotice(run:Run,reference?:Run):RouteNotice{
  const trusted=reference&&reference.id===run.referenceId&&reference.routeId===run.routeId&&reference.mode===run.mode&&isComparable(run)&&!run.comparison?.unavailable;
  // El último parcial del fantasma ya compara tramo a tramo; sirve también al entrar a mitad.
  const split=run.comparison?.splits.at(-1);
  const difference=trusted?(split&&split.difference!==null?split.difference:duration(run)-duration(reference)):null;
  const message=difference===null?t('notice.arrival.saved'):differenceText(difference);
  return {id:`${run.id}:arrival`,kind:'arrival',title:t('notice.arrival.title'),message:t('notice.arrival.message',{difference:message}),createdAt:run.endedAt??run.lastFixAt??run.startedAt};
}
export function entryNotice(run:Run,createdAt:number):RouteNotice{
  return {id:`${run.id}:entry`,kind:'entry',title:t('notice.entry.title'),message:t('notice.entry.message'),createdAt};
}
export function validNotice(value:unknown):value is RouteNotice{
  if(typeof value!=='object'||value===null)return false;const v=value as RouteNotice;
  return typeof v.id==='string'&&v.id.length>0&&v.id.length<=240&&(v.kind==='checkpoint'||v.kind==='arrival'||v.kind==='entry')&&typeof v.title==='string'&&v.title.length<=100&&typeof v.message==='string'&&v.message.length<=500&&Number.isFinite(v.createdAt)&&v.createdAt>=0&&v.createdAt<8640000000000000;
}
