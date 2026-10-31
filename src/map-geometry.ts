import type { Point } from './core.ts';
export function courseBounds(points:readonly Point[]):[number,number,number,number]|null {
  if(!points.length)return null;
  let west=180,east=-180,south=90,north=-90;
  for(const p of points){west=Math.min(west,p.longitude);east=Math.max(east,p.longitude);south=Math.min(south,p.latitude);north=Math.max(north,p.latitude);}
  return [Math.max(-180,west-0.00005),Math.max(-90,south-0.00005),Math.min(180,east+0.00005),Math.min(90,north+0.00005)];
}
