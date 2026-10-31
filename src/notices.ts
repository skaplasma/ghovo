import {duration,isComparable,type Run} from './core.ts';
import type {Split} from './comparison.ts';
export type RouteNotice={id:string;kind:'checkpoint'|'arrival'|'entry';title:string;message:string;createdAt:number};
const secondsText=(difference:number)=>{const seconds=Math.round(Math.abs(difference)/1000);return `${seconds} ${seconds===1?'segundo':'segundos'}`;};
const differenceText=(difference:number|null)=>difference===null?'Sin comparación fiable de tiempo.':Math.abs(difference)<500?'Mismo tiempo que la referencia.':`${secondsText(difference)} ${difference<0?'menos':'más'} que la referencia.`;
export function checkpointNotice(run:Run,split:Split,createdAt:number):RouteNotice{
  const km=Number((split.meters/1000).toFixed(2)).toLocaleString('es-ES');
  return {id:`${run.id}:checkpoint:${split.meters}`,kind:'checkpoint',title:`Control · Km ${km}`,message:`Punto de control. Kilómetro ${km}. ${differenceText(split.difference)}`,createdAt};
}
export function arrivalNotice(run:Run,reference?:Run):RouteNotice{
  const trusted=reference&&reference.id===run.referenceId&&reference.routeId===run.routeId&&reference.mode===run.mode&&isComparable(run)&&!run.comparison?.unavailable;
  const difference=trusted?duration(run)-duration(reference):null;
  return {id:`${run.id}:arrival`,kind:'arrival',title:'Felicidades, has llegado',message:`Felicidades, has llegado. ${difference===null?'Ruta guardada.':Math.abs(difference)<500?'Llegaste en el mismo tiempo que la referencia.':`Llegaste ${secondsText(difference)} ${difference<0?'antes':'más tarde'} que la referencia.`}`,createdAt:run.endedAt??run.lastFixAt??run.startedAt};
}
export function entryNotice(run:Run,createdAt:number):RouteNotice{
  return {id:`${run.id}:entry`,kind:'entry',title:'Circuito detectado',message:'Entrando en la ruta. Fantasma activado.',createdAt};
}
export function validNotice(value:unknown):value is RouteNotice{
  if(typeof value!=='object'||value===null)return false;const v=value as RouteNotice;
  return typeof v.id==='string'&&v.id.length>0&&v.id.length<=240&&(v.kind==='checkpoint'||v.kind==='arrival'||v.kind==='entry')&&typeof v.title==='string'&&v.title.length<=100&&typeof v.message==='string'&&v.message.length<=500&&Number.isFinite(v.createdAt)&&v.createdAt>=0&&v.createdAt<8640000000000000;
}
