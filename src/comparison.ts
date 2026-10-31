import {accepts,distance,isComparable,isTraceBreak,type Point,type Run} from './core.ts';
import {checkpointsFor,type CheckpointInterval} from './checkpoints.ts';
export type Split={meters:number;elapsed:number|null;referenceElapsed:number;difference:number|null};
export type ComparisonState={progress:number;segment:number;lastFixAt:number;lastMatchedAt:number;unavailable:boolean;difference:number|null;splits:Split[];arrivalSince?:number;arrivalAnchor?:Point};
export type CourseModel={reference:Run;meters:number[];total:number;controls:{meters:number;referenceElapsed:number}[];valid:boolean};
// A destination is an area (e.g. nearby parking), not a single GPS coordinate.
export const destinationRadius=(total:number)=>Math.min(150,Math.max(30,total*.2));
const referenceGap=(a:Point,b:Point)=>isTraceBreak(a,b)||(b.timestamp-a.timestamp>30000&&distance(a,b)>5);
export const validReferenceChoice=(value:unknown):value is string=>typeof value==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,159}$/.test(value)&&!['constructor','prototype','__proto__'].includes(value);
export function selectReference(attempts:Run[],choice='latest',mode?:Run['mode']){
  const candidates=attempts.filter(r=>r.mode===mode&&r.endedAt!==undefined&&isComparable(r)&&r.points.length>1&&!r.points.some((p,i)=>i>0&&referenceGap(r.points[i-1],p)));
  if(choice==='best')return candidates.reduce<Run|undefined>((best,r)=>!best||r.endedAt!-r.startedAt<best.endedAt!-best.startedAt?r:best,undefined);
  if(choice!=='latest')return candidates.find(r=>r.id===choice);
  return candidates.reduce<Run|undefined>((latest,r)=>!latest||r.startedAt>latest.startedAt?r:latest,undefined);
}
export function courseModel(reference:Run,interval?:CheckpointInterval|null):CourseModel{
  const meters=[0];let valid=isComparable(reference)&&reference.points.length>1;
  for(let i=1;i<reference.points.length;i++){if(referenceGap(reference.points[i-1],reference.points[i]))valid=false;meters.push(meters[i-1]+distance(reference.points[i-1],reference.points[i]));}
  const total=meters.at(-1)??0;
  const controls=checkpointsFor(reference.points,interval).points.map(cp=>({meters:cp.meters,referenceElapsed:cp.point.timestamp-reference.startedAt}));
  if(total>0)controls.push({meters:total,referenceElapsed:reference.points.at(-1)!.timestamp-reference.startedAt});
  return {reference,meters,total,controls,valid:valid&&total>=50};
}
export function initialComparison(startedAt:number):ComparisonState{return {progress:0,segment:0,lastFixAt:startedAt,lastMatchedAt:startedAt,unavailable:false,difference:0,splits:[]};}
function referenceTime(model:CourseModel,meters:number,segment:number){const points=model.reference.points,a=points[segment],b=points[Math.min(segment+1,points.length-1)];const d=model.meters[segment+1]-model.meters[segment];const fraction=d?Math.max(0,Math.min(1,(meters-model.meters[segment])/d)):0;return a.timestamp-model.reference.startedAt+(b.timestamp-a.timestamp)*fraction;}
export function advanceComparison(model:CourseModel,state:ComparisonState,point:Point,startedAt:number,speed?:number):ComparisonState{
  if(point.timestamp<=state.lastFixAt)return state;
  const lost={...state,lastFixAt:Number.isFinite(point.timestamp)?point.timestamp:state.lastFixAt,unavailable:true,difference:null,arrivalSince:undefined,arrivalAnchor:undefined};
  if(!model.valid||point.accuracy>25||point.accuracy<0||![point.latitude,point.longitude,point.timestamp,point.accuracy].every(Number.isFinite))return lost;
  const lookAhead=Math.min(3000,Math.max(120,(point.timestamp-state.lastMatchedAt)/1000*60+50));
  let best:{progress:number;segment:number;offset:number}|undefined;
  const points=model.reference.points;
  for(let i=Math.max(0,state.segment-2);i<points.length-1&&model.meters[i]<=state.progress+lookAhead;i++){
    if(model.meters[i+1]<state.progress-12)continue;
    const a=points[i],b=points[i+1],cos=Math.max(0.01,Math.cos(point.latitude*Math.PI/180));
    const x=(p:Point)=>(((p.longitude-point.longitude+540)%360)-180)*cos*111195;
    const y=(p:Point)=>(p.latitude-point.latitude)*111195;
    const ax=x(a),ay=y(a),dx=x(b)-ax,dy=y(b)-ay;
    const f=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
    const progress=model.meters[i]+(model.meters[i+1]-model.meters[i])*f;
    if(progress<state.progress-12||progress>state.progress+lookAhead)continue;
    const offset=Math.hypot(ax+dx*f,ay+dy*f);
    if(!best||offset<best.offset-0.5)best={progress,segment:i,offset};
  }
  const radius=destinationRadius(model.total);
  const finishZone=best&&best.progress>=model.total-radius&&distance(point,points.at(-1)!)<=radius;
  if(!best||best.offset>(finishZone?radius:30))return lost;
  const progress=Math.max(state.progress,best.progress),elapsed=point.timestamp-startedAt;
  const continuous=!state.unavailable&&point.timestamp-state.lastFixAt<=15000;
  const splits=[...state.splits];
  for(const cp of model.controls){if(cp.meters>progress+0.01||splits.some(s=>Math.abs(s.meters-cp.meters)<0.01))continue;
    const f=progress>state.progress?(cp.meters-state.progress)/(progress-state.progress):1;
    const crossing=continuous&&cp.meters>=state.progress?state.lastFixAt-startedAt+(point.timestamp-state.lastFixAt)*Math.max(0,Math.min(1,f)):null;
    splits.push({meters:cp.meters,elapsed:crossing,referenceElapsed:cp.referenceElapsed,difference:crossing===null?null:crossing-cp.referenceElapsed});
  }
  const atFinish=continuous&&progress>=Math.max(model.total-radius,model.total*.85)&&distance(point,points.at(-1)!)<=radius&&point.accuracy<=25;
  const stopped=atFinish&&(speed===undefined||!Number.isFinite(speed)||speed<0||speed<=0.8);
  const stability=typeof speed==='number'&&Number.isFinite(speed)&&speed>=0?Math.max(5,Math.min(15,point.accuracy)):Math.max(2,Math.min(5,point.accuracy));
  const anchored=stopped&&state.arrivalAnchor&&distance(state.arrivalAnchor,point)<=stability;
  return {progress,segment:best.segment,lastFixAt:point.timestamp,lastMatchedAt:point.timestamp,unavailable:false,difference:elapsed-referenceTime(model,progress,best.segment),splits,arrivalSince:stopped?(anchored?state.arrivalSince??point.timestamp:point.timestamp):undefined,arrivalAnchor:stopped?(anchored?state.arrivalAnchor:point):undefined};
}
export function arrivalReady(state:ComparisonState,now:number){return !state.unavailable&&state.arrivalSince!==undefined&&now-state.arrivalSince>=5000&&now-state.lastFixAt<=15000;}
export function validComparison(value:unknown):value is ComparisonState{
  if(typeof value!=='object'||value===null)return false;const v=value as ComparisonState;
  if(v.arrivalAnchor!==undefined&&(typeof v.arrivalAnchor!=='object'||v.arrivalAnchor===null||!accepts([],v.arrivalAnchor)||v.arrivalAnchor.timestamp<0))return false;
  return Number.isFinite(v.progress)&&v.progress>=0&&Number.isInteger(v.segment)&&v.segment>=0&&Number.isFinite(v.lastFixAt)&&v.lastFixAt>=0&&Number.isFinite(v.lastMatchedAt)&&v.lastMatchedAt>=0&&typeof v.unavailable==='boolean'&&(v.difference===null||Number.isFinite(v.difference))&&(v.arrivalSince===undefined||Number.isFinite(v.arrivalSince)&&v.arrivalSince>=0)&&Array.isArray(v.splits)&&v.splits.length<=1002&&v.splits.every((s,i)=>typeof s==='object'&&s!==null&&Number.isFinite(s.meters)&&s.meters>=0&&(i===0||s.meters>v.splits[i-1].meters)&&Number.isFinite(s.referenceElapsed)&&s.referenceElapsed>=0&&(s.elapsed===null||Number.isFinite(s.elapsed)&&s.elapsed>=0)&&(s.difference===null||Number.isFinite(s.difference)));
}
export function finishComparison(model:CourseModel,state:ComparisonState,elapsed:number):ComparisonState{
  const referenceElapsed=model.reference.points.at(-1)!.timestamp-model.reference.startedAt;
  const trusted=!state.unavailable&&model.valid;
  return {...state,splits:[...state.splits.filter(s=>s.meters<model.total-0.01),{meters:model.total,elapsed:trusted?elapsed:null,referenceElapsed,difference:trusted?elapsed-referenceElapsed:null}]};
}
