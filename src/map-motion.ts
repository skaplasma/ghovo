import type {Point} from './core.ts';
// Display only: these values must never be written back to recorded GPS points.
export function motionDuration(previous:Point|undefined,next:Point){
 if(!previous)return 0;
 const elapsed=next.timestamp-previous.timestamp;
 const dy=(next.latitude-previous.latitude)*111195;
 const dx=(((next.longitude-previous.longitude+540)%360)-180)*111195*Math.cos(next.latitude*Math.PI/180);
 const distance=Math.hypot(dx,dy);
 if(!Number.isFinite(elapsed)||!Number.isFinite(distance)||elapsed<=0||elapsed>6000||distance>250||distance===0)return 0;
 return Math.min(1000,Math.max(250,elapsed));
}
export function interpolateDisplayPoint(from:Point,to:Point,progress:number):Point{
 const t=Math.max(0,Math.min(1,progress));
 if(t===1)return to;
 const delta=((to.longitude-from.longitude+540)%360)-180;
 return {...to,latitude:from.latitude+(to.latitude-from.latitude)*t,longitude:((from.longitude+delta*t+540)%360)-180};
}
