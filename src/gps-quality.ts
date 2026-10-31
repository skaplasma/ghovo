import {accepts,distance,type Point} from './core.ts';
// Require distinct observations spanning two seconds; repeated cached fixes do not count.
export function stableFixes(previous:Point[],point:Point):Point[]{
  if(!accepts([],point))return [];
  const last=previous.at(-1);
  if(last&&point.timestamp<=last.timestamp)return previous;
  if(last&&point.timestamp-last.timestamp<800)return previous;
  const consistent=(!last||point.timestamp-last.timestamp<=6000)&&previous.every(p=>point.timestamp-p.timestamp<=12000&&distance(p,point)<=Math.min(35,Math.max(10,p.accuracy+point.accuracy)));
  return [...(consistent?previous:[]),point].slice(-5);
}
export const fixReady=(points:Point[])=>points.length>=3&&points.at(-1)!.timestamp-points[0].timestamp>=2000;
