import {makeBackup,parseBackup} from './backup.ts';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {advanceComparison,arrivalReady,courseModel,initialComparison,selectReference,finishComparison} from './comparison.ts';
import {referenceForRun} from './route-entry.ts';
import {resultFor} from './results.ts';
import type {Point,Run} from './core.ts';
const p=(meters:number,timestamp:number,latitude=0):Point=>({latitude,longitude:meters/6371000*180/Math.PI,timestamp,accuracy:5});
const reference=(id='ref',startedAt=0,rate=1000):Run=>({id,routeId:'commute',name:'Casa → Trabajo',mode:'driving',startedAt,endedAt:startedAt+500*rate,points:Array.from({length:501},(_,i)=>p(i*10,startedAt+i*rate)),gpsGaps:0});
test('last, best and explicit reference stay separate and modes never mix',()=>{
  const first=reference('first',0,900),last=reference('last',1000000,1100),walk={...reference('walk',2000000,800),mode:'walking' as const};
  assert.equal(selectReference([first,last,walk],'latest','driving')?.id,'last');assert.equal(selectReference([first,last,walk],'best','driving')?.id,'first');assert.equal(selectReference([first,last],'first','driving')?.id,'first');assert.equal(selectReference([first,last],'missing','driving'),undefined);
  const attempt={...reference('today',3000000,1000),referenceId:'last'};assert.equal(resultFor(attempt,[first,last,attempt]).difference,-50000);
});
test('ordered crossings interpolate time differences and preserve stops',()=>{
  const model=courseModel(reference(),2),startedAt=1000000;let state=initialComparison(startedAt);
  for(let i=1;i<=500;i++)state=advanceComparison(model,state,p(i*10,startedAt+i*1000+(i>=100?5000:0)),startedAt);
  assert.equal(state.unavailable,false);assert.deepEqual(state.splits.map(s=>Math.round(s.meters)),[2000,4000,5000]);assert.equal(Math.round(state.splits[0].difference!),5000);
  const final=finishComparison(model,state,505000);assert.equal(final.splits.at(-1)?.difference,5000);
});
test('off-course fixes hide comparison and missed checkpoints are not invented',()=>{
  const model=courseModel(reference(),2),startedAt=1000000;let state=initialComparison(startedAt);
  for(let i=1;i<195;i++)state=advanceComparison(model,state,p(i*10,startedAt+i*1000),startedAt);
  state=advanceComparison(model,state,p(1950,startedAt+195000,0.001),startedAt);assert.equal(state.unavailable,true);assert.equal(state.difference,null);
  state=advanceComparison(model,state,p(2200,startedAt+220000),startedAt);assert.equal(state.unavailable,false);assert.equal(state.splits[0].elapsed,null);assert.equal(state.splits[0].difference,null);
});
test('passing near the finish at the start cannot complete the route; arrival needs dwell',()=>{
  const model=courseModel(reference(),2),startedAt=1000000;let state=initialComparison(startedAt);
  state=advanceComparison(model,state,p(5000,startedAt+1000),startedAt);assert.equal(arrivalReady(state,startedAt+7000),false);
  state=initialComparison(startedAt);for(let i=1;i<=495;i++)state=advanceComparison(model,state,p(i*10,startedAt+i*1000),startedAt);
  assert.equal(arrivalReady(state,startedAt+495000),false);
  state=advanceComparison(model,state,p(5000,startedAt+505000),startedAt);assert.equal(arrivalReady(state,startedAt+505000),false);
  state=advanceComparison(model,state,p(5000,startedAt+510000),startedAt);assert.equal(arrivalReady(state,startedAt+510000),true);
  state=advanceComparison(model,state,p(5000,startedAt+511000,0.001),startedAt);assert.equal(arrivalReady(state,startedAt+511000),false);
});
test('a reference containing GPS gaps cannot generate a reliable comparison',()=>{
  const r=reference();r.points=r.points.map((point,i)=>({...point,timestamp:point.timestamp+(i>=20?60000:0)}));
  const model=courseModel(r,2);assert.equal(model.valid,false);assert.equal(advanceComparison(model,initialComparison(1000000),p(10,1001000),1000000).unavailable,true);
});

test('selected reference and split records survive backup round trip',()=>{
  const original=reference(),today={...reference('today',1000000),referenceId:original.id,checkpointKm:2 as const,autoFinish:true,comparison:initialComparison(1000000)};
  today.comparison=advanceComparison(courseModel(original,2),today.comparison,p(10,1001000),today.startedAt);
  const backup=parseBackup(JSON.stringify(makeBackup([original,today],{commute:{favorite:true,note:'',referenceChoice:original.id,checkpointKm:2,autoFinish:true}},2000000)));
  assert.equal(backup.runs[1].referenceId,original.id);assert.deepEqual(backup.runs[1].comparison,JSON.parse(JSON.stringify(today.comparison)));assert.equal(backup.routeDetails.commute.referenceChoice,original.id);
});

test('aparcar en la meta no suma segundos a la diferencia',()=>{
  const model=courseModel(reference(),2),startedAt=1000000;
  let state=initialComparison(startedAt);
  for(let i=1;i<=500;i++)state=advanceComparison(model,state,p(i*10,startedAt+i*1000),startedAt);
  assert.equal(Math.round(state.difference!),0);
  // Treinta posiciones más con el coche ya parado en la meta.
  for(let i=1;i<=30;i++)state=advanceComparison(model,state,p(5000,startedAt+500000+i*1000),startedAt,0);
  assert.ok(Math.abs(state.difference!)<=1000,`la diferencia creció a ${state.difference} ms`);
});

test('un intento que entra a mitad se compara con su tramo, no con la ruta entera',()=>{
  const full=reference('full',0,1000);
  const entryOffset=200000;
  const tail=courseModel(referenceForRun({...full,referenceOffsetMs:entryOffset},full)!);
  let state=initialComparison(1000000);
  const points=Array.from({length:301},(_,i)=>p(2000+i*10,1000000+i*1000));
  for(const point of points)state=advanceComparison(tail,state,point,1000000);
  const joined:Run={...full,id:'joined',startedAt:1000000,circuitStartedAt:1000000,endedAt:1300000,referenceId:'full',referenceOffsetMs:entryOffset,points,comparison:state};
  const result=resultFor(joined,[full,joined]);
  assert.ok(Math.abs(result.difference!)<=1000,`diferencia ${result.difference}`);
  assert.notEqual(result.status,'record');
});
