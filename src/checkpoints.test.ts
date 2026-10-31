import assert from 'node:assert/strict';
import {test} from 'node:test';
import {checkpointsFor} from './checkpoints.ts';
import type {Point,Run} from './core.ts';
import {makeBackup,parseBackup} from './backup.ts';
import {validStateValue} from './state-validation.ts';
const point=(meters:number,timestamp:number):Point=>({latitude:0,longitude:meters/6371000*180/Math.PI,timestamp,accuracy:5});
const route=(meters:number)=>Array.from({length:Math.ceil(meters/500)+1},(_,i)=>point(Math.min(i*500,meters),i*1000));
test('20 km at 5 km creates exactly three checkpoints, with finish excluded',()=>{
  const result=checkpointsFor(route(20000),5);assert.equal(result.unavailable,false);assert.deepEqual(result.points.map(p=>p.meters),[5000,10000,15000]);
  for(const cp of result.points)assert.ok(Math.abs(cp.point.longitude-point(cp.meters,0).longitude)<1e-8);
});
test('short, exact and non-multiple lengths never duplicate the finish',()=>{
  assert.equal(checkpointsFor(route(2000),2).points.length,0);
  assert.equal(checkpointsFor(route(1500),2).points.length,0);
  assert.deepEqual(checkpointsFor(route(19000),5).points.map(p=>p.meters),[5000,10000,15000]);
  for(const km of [2,5,10,20,50] as const)assert.equal(checkpointsFor(route(km*1000),km).points.length,0);
  assert.equal(checkpointsFor(route(20000),null).points.length,0);
});
test('changing spacing recalculates checkpoints and breaks never get bridged',()=>{
  assert.equal(checkpointsFor(route(20000),2).points.length,9);
  assert.equal(checkpointsFor(route(20000),10).points.length,1);
  const broken=route(20000).map((p,i)=>({...p,timestamp:p.timestamp+(i>=10?60000:0)}));
  assert.equal(checkpointsFor(broken,5).unavailable,true);assert.equal(checkpointsFor(broken,5).points.length,0);
});
test('checkpoint settings survive backup and invalid intervals are rejected',()=>{
  const points=route(20000);const run:Run={id:'one',routeId:'route',name:'Casa',points,startedAt:0,endedAt:points.at(-1)!.timestamp};
  const backup=makeBackup([run],{route:{favorite:false,note:'',checkpointKm:5}},50000);
  assert.equal(parseBackup(JSON.stringify(backup)).routeDetails.route.checkpointKm,5);
  assert.equal(validStateValue('routeDetails',{route:{favorite:false,note:'',checkpointKm:3}}),false);
  assert.throws(()=>parseBackup(JSON.stringify({...backup,routeDetails:{route:{favorite:false,note:'',checkpointKm:3}}})));
});
