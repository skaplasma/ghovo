import { isTraceBreak, type Point } from './core.ts';
export function traceSegments(points:Point[],includeSingle=false):Point[][] {
  const segments:Point[][]=[];
  for(const point of points){
    const segment=segments.at(-1),previous=segment?.at(-1);
    if(!previous||isTraceBreak(previous,point))segments.push([point]);
    else segment!.push(point);
  }
  return segments.filter(segment=>includeSingle||segment.length>1);
}
