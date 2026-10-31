import {accepts,distance,ghostAt,type Point,type Run} from './core.ts';
export function routeEntry(reference:Run,point:Point):{offset:number;meters:number}|undefined{
 if(!accepts([],point)||reference.points.length<2)return;
 let meters=0,best:{offset:number;meters:number;distance:number}|undefined;
 const nearStart=distance(point,reference.points[0])<=50;
 for(let i=0;i<reference.points.length-1;i++){
  const a=reference.points[i],b=reference.points[i+1],cos=Math.max(.01,Math.cos(point.latitude*Math.PI/180));
  const x=(p:Point)=>(((p.longitude-point.longitude+540)%360)-180)*111195*cos,y=(p:Point)=>(p.latitude-point.latitude)*111195;
  const ax=x(a),ay=y(a),dx=x(b)-ax,dy=y(b)-ay,f=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1))),segment=distance(a,b),offset=Math.hypot(ax+f*dx,ay+f*dy);
  if(offset<=(nearStart?50:30)&&(!best||offset<best.distance-.5))best={offset:a.timestamp-reference.startedAt+(b.timestamp-a.timestamp)*f,meters:meters+segment*f,distance:offset};
  meters+=segment;
 }
 if(!best||meters-best.meters<50)return;
 return {offset:best.meters<=50?0:best.offset,meters:best.meters};
}
let cachedOriginal:Run|undefined,cachedOffset:number|undefined,cachedTail:Run|undefined;
export function referenceForRun(run:Run,reference:Run|undefined):Run|undefined{
 const offset=run.referenceOffsetMs??0;if(!reference||!offset)return reference;
 if(cachedOriginal===reference&&cachedOffset===offset)return cachedTail;
 const first=ghostAt(reference,offset),startedAt=reference.startedAt+offset;
 if(!first||startedAt>=reference.points.at(-1)!.timestamp)return;
 cachedOriginal=reference;cachedOffset=offset;cachedTail={...reference,startedAt,points:[first,...reference.points.filter(point=>point.timestamp>startedAt)]};return cachedTail;
}
