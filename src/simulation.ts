import { appendFix, type Point, type Run, type TravelMode } from './core.ts';
export type Signal='good'|'weak'|'lost';
export const SIMULATION_STEPS=180;
export function simulationPoint(step:number,origin?:Point):Point {
  const latitude=origin?.latitude??41.3851,longitude=origin?.longitude??2.1734;
  // Fictional curved circuit, generated locally; never a road-routing result.
  const angle=Math.min(SIMULATION_STEPS,Math.max(0,step))/SIMULATION_STEPS*Math.PI*2;
  return {latitude:latitude+500*Math.sin(angle)/111195,longitude:((longitude+500*(1-Math.cos(angle))/(111195*Math.max(.1,Math.cos(latitude*Math.PI/180)))+540)%360)-180,timestamp:1700000000000+step*1000,accuracy:5};
}
export function newSimulation(mode:TravelMode='driving',origin?:Point):Run {
  const point=simulationPoint(0,origin);
  return {id:'simulation',routeId:'simulation',name:'Circuito ficticio',mode,startedAt:point.timestamp,lastFixAt:point.timestamp,points:[point]};
}
export function advanceSimulation(run:Run,step:number,signal:Signal,origin?:Point):Run {
  if(signal==='lost')return run;
  return appendFix(run,{...simulationPoint(step,origin),accuracy:signal==='weak'?80:5});
}
