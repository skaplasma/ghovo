import {distance,isTraceBreak,type Point} from './core.ts';
export const CHECKPOINT_INTERVALS=[2,5,10,20,50] as const;
export type CheckpointInterval=typeof CHECKPOINT_INTERVALS[number];
export const validCheckpointInterval=(value:unknown):value is CheckpointInterval=>CHECKPOINT_INTERVALS.some(km=>km===value);
export type Checkpoint={index:number;meters:number;point:Point};
export function checkpointsFor(points:Point[],interval?:CheckpointInterval|null){
  let total=0;
  for(let i=1;i<points.length;i++){
    if(isTraceBreak(points[i-1],points[i]))return {points:[] as Checkpoint[],total:0,unavailable:true};
    total+=distance(points[i-1],points[i]);
  }
  const checkpoints:Checkpoint[]=[];
  if(!interval||!validCheckpointInterval(interval))return {points:checkpoints,total,unavailable:false};
  const step=interval*1000;
  // A small numerical tolerance excludes the finish when the sum rounds just above it.
  if(total/step>1001)return {points:checkpoints,total,unavailable:true};
  let traveled=0,target=step;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i],segment=distance(a,b);
    while(target<=traveled+segment&&target<total-0.01){
      const fraction=segment?(target-traveled)/segment:0;
      const longitudeDelta=((b.longitude-a.longitude+540)%360)-180;
      checkpoints.push({index:checkpoints.length+1,meters:target,point:{latitude:a.latitude+(b.latitude-a.latitude)*fraction,longitude:((a.longitude+longitudeDelta*fraction+540)%360)-180,timestamp:a.timestamp+(b.timestamp-a.timestamp)*fraction,accuracy:Math.max(a.accuracy,b.accuracy)}});
      target+=step;
    }
    traveled+=segment;
  }
  return {points:checkpoints,total,unavailable:false};
}
