import type {RouteNotice} from './notices.ts';
import type {ComparisonState} from './comparison.ts';
import type {CheckpointInterval} from './checkpoints.ts';
export type Point = { latitude: number; longitude: number; timestamp: number; accuracy: number };
export type TravelMode = 'walking' | 'driving' | 'bicycling' | 'running';
export type Run = { id: string; routeId: string; name: string; mode?: TravelMode; points: Point[]; startedAt: number; circuitStartedAt?: number; endedAt?: number; referenceOffsetMs?:number;incomplete?:boolean;error?: string; referenceId?:string; checkpointKm?:CheckpointInterval|null; autoFinish?:boolean;autoCompleted?:boolean;voiceEnabled?:boolean;notice?:RouteNotice;comparison?:ComparisonState; lastAccuracy?:number; lastFixAt?: number; gpsGaps?: number; maxGpsGapMs?: number; rejectedFixes?: number; pausedAt?: number; entryPendingAt?: number };
export const distance = (a: Point, b: Point) => {
  const r = Math.PI / 180;
  const x = Math.sin((b.latitude-a.latitude)*r/2)**2 + Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin((b.longitude-a.longitude)*r/2)**2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(Math.min(1,Math.max(0,x))), Math.sqrt(Math.max(0,1-x)));
};
export const isTraceBreak=(a:Point,b:Point)=>b.timestamp-a.timestamp>15000&&distance(a,b)>20;
export const length = (p: Point[]) => p.slice(1).reduce((sum, v, i) => sum + (isTraceBreak(p[i],v)?0:distance(p[i], v)), 0);
export const duration = (r: Run) => (r.endedAt ?? Date.now()) - (r.circuitStartedAt ?? r.startedAt) - (r.pausedAt ? Date.now() - r.pausedAt : 0);
export function ghostAt(run: Run, elapsed: number): Point | undefined {
  const t = run.startedAt + Math.max(0, elapsed), p = run.points;
  if(!p.length)return undefined;
  let lower=0,upper=p.length;
  while(lower<upper){const middle=Math.floor((lower+upper)/2);if(p[middle].timestamp<t)lower=middle+1;else upper=middle;}
  const i=lower;
  if (i === p.length) return p.at(-1);
  if (!i) return p[0];
  const a=p[i-1], b=p[i], f=(t-a.timestamp)/(b.timestamp-a.timestamp);
  if(isTraceBreak(a,b)&&t<b.timestamp)return undefined;
  const delta=((b.longitude-a.longitude+540)%360)-180;
  return {...a, latitude:a.latitude+(b.latitude-a.latitude)*f, longitude:((a.longitude+delta*f+540)%360)-180, timestamp:t};
}
export const isComparable=(run:Run)=>!run.incomplete&&!run.referenceOffsetMs&&(run.gpsGaps??0)===0;
export function accepts(points: Point[], p: Point, mode:TravelMode='walking') {
  if (![p.latitude,p.longitude,p.timestamp,p.accuracy].every(Number.isFinite) || Math.abs(p.latitude)>90 || Math.abs(p.longitude)>180 || p.accuracy < 0 || p.accuracy > 25) return false;
  const prev=points.at(-1);
  const maxSpeed = mode === 'driving' ? 60 : mode === 'bicycling' ? 25 : 12;
  return !prev || (p.timestamp > prev.timestamp && distance(prev,p)/((p.timestamp-prev.timestamp)/1000) <= maxSpeed);
}
export function recordingQuality(points: Point[]) {
  let gaps=0, longestGap=0;
  for(let i=1;i<points.length;i++) {
    const gap=points[i].timestamp-points[i-1].timestamp;
    longestGap=Math.max(longestGap,gap);
    if(gap>30000) gaps++;
  }
  const averageAccuracy=points.length?points.reduce((sum,p)=>sum+p.accuracy,0)/points.length:0;
  return {gaps,longestGap,averageAccuracy};
}
export function appendFix(run:Run,point:Point):Run {
  const previous=run.points.at(-1);
  const lastFix=run.lastFixAt??previous?.timestamp??run.startedAt;
  if(point.timestamp<=lastFix||point.timestamp<run.startedAt)return run;
  if(!accepts(previous?[{...previous,timestamp:lastFix}]:[],point,run.mode))return {...run,rejectedFixes:(run.rejectedFixes??0)+1};
  const gap=point.timestamp-lastFix;
  const next:Run={...run,lastAccuracy:point.accuracy,lastFixAt:point.timestamp,gpsGaps:(run.gpsGaps??0)+(gap>30000?1:0),maxGpsGapMs:Math.max(run.maxGpsGapMs??0,gap)};
  delete next.error;
  // Ignore tiny movements within GPS uncertainty, but keep the heartbeat and dwell time.
  const minimumMovement=Math.max(2,Math.min(5,point.accuracy*0.5));
  if(previous&&distance(previous,point)<minimumMovement)return next;
  const points=[...run.points];
  if(previous&&lastFix>previous.timestamp)points.push({...previous,timestamp:lastFix});
  points.push(point);
  return {...next,points};
}
export function endPoints(run:Run):Point[] {
  const last=run.points.at(-1);
  return last&&run.lastFixAt&&run.lastFixAt>last.timestamp?[...run.points,{...last,timestamp:run.lastFixAt}]:run.points;
}
// Compare uniformly spaced geometry so different GPS sampling rates remain comparable.
function sampledCourse(points:Point[],step=10):Point[] {
  if(!points.length)return [];
  const result=[points[0]];
  let carried=0;
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i],segment=distance(a,b);
    if(segment===0)continue;
    for(let along=step-carried;along<=segment;along+=step) {
      if(result.length>=25000)return [];
      const f=along/segment;
      const delta=((b.longitude-a.longitude+540)%360)-180;
      result.push({...a,latitude:a.latitude+(b.latitude-a.latitude)*f,longitude:((a.longitude+delta*f+540)%360)-180});
    }
    carried=(carried+segment)%step;
  }
  if(distance(result.at(-1)!,points.at(-1)!)>0.5)result.push(points.at(-1)!);
  return result;
}
// Ordered correspondence in both directions prevents reversal and omitted detours.
export function sameCourse(reference: Point[], attempt: Point[]) {
  if (reference.length < 2 || attempt.length < 2 || distance(reference[0],attempt[0])>50 || distance(reference.at(-1)!,attempt.at(-1)!)>50) return false;
  const referenceLength=length(reference);
  if(referenceLength<1||Math.abs(referenceLength-length(attempt))/referenceLength>0.15)return false;
  const origin=reference[0],scale=Math.cos(origin.latitude*Math.PI/180)*111195;
  const project=(p:Point)=>[(((p.longitude-origin.longitude+540)%360)-180)*scale,(p.latitude-origin.latitude)*111195];
  const sampledReference=sampledCourse(reference),sampledAttempt=sampledCourse(attempt);
  if(!sampledReference.length||!sampledAttempt.length)return false;
  const follows = (a: Point[], b: Point[]) => {
    const projected=b.map(project),buckets=new Map<string,number[]>();
    projected.forEach(([x,y],i)=>{const key=`${Math.floor(x/35)},${Math.floor(y/35)}`;const bucket=buckets.get(key);if(bucket)bucket.push(i);else buckets.set(key,[i]);});
    let cursor=0;
    for (const p of a) {
      // Parking may differ inside the endpoint zones; interior route matching stays strict.
      if(distance(p,reference[0])<=50||distance(p,reference.at(-1)!)<=50)continue;
      const [x,y]=project(p),gx=Math.floor(x/35),gy=Math.floor(y/35);
      if(Math.hypot(projected[cursor][0]-x,projected[cursor][1]-y)<=35)continue;
      // Keep the earliest reachable point, rather than the nearest future point.
      // At a crossing or a return to A, "nearest" can jump to the end of a loop.
      let found=Infinity;
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const j of buckets.get(`${gx+dx},${gy+dy}`)??[]) {
        if(j<cursor||j>=found)continue;
        const d=Math.hypot(projected[j][0]-x,projected[j][1]-y);
        if(d<=35)found=j;
      }
      if(!Number.isFinite(found))return false;
      cursor=found;
    }
    return true;
  };
  return follows(sampledReference,sampledAttempt) && follows(sampledAttempt,sampledReference);
}
export const clock = (ms: number) => `${Math.floor(ms/60000).toString().padStart(2,'0')}:${Math.floor(ms/1000%60).toString().padStart(2,'0')}`;
