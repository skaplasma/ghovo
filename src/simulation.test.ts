import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceSimulation,newSimulation,simulationPoint} from './simulation.ts';
import {accepts,ghostAt,length} from './core.ts';
import {traceSegments} from './trace.ts';
import {makeBackup,runToGpx} from './backup.ts';
test('a realistic car trace is accepted by driving mode and rejected by the walking filter',()=>{
  let driving=newSimulation('driving'),walking=newSimulation('walking');
  for(let step=1;step<=60;step++){driving=advanceSimulation(driving,step,'good');walking=advanceSimulation(walking,step,'good');}
  assert.equal(driving.points.length,61);assert.ok(walking.rejectedFixes!>0);
  assert.equal(accepts([simulationPoint(0)],{...simulationPoint(1),latitude:0},'driving'),false);
});
test('loss of signal never draws, measures or replays an invented straight connection',()=>{
  let run=newSimulation();for(let step=1;step<=10;step++)run=advanceSimulation(run,step,'good');
  const before=run.points.length;
  for(let step=11;step<=50;step++)run=advanceSimulation(run,step,'lost');
  assert.equal(run.points.length,before);
  for(let step=51;step<=60;step++)run=advanceSimulation(run,step,'good');
  assert.equal(run.gpsGaps,1);assert.equal(traceSegments(run.points).length,2);
  assert.equal(ghostAt(run,30000),undefined);assert.ok(length(run.points)<400);
  const xml=runToGpx({...run,endedAt:run.points.at(-1)!.timestamp});
  assert.equal((xml.match(/<trkseg>/g)??[]).length,2);
});
test('weak fixes remain rejected and the travel mode survives backup round trip',()=>{
  let run=newSimulation();for(let step=1;step<=10;step++)run=advanceSimulation(run,step,'weak');
  assert.equal(run.points.length,1);assert.equal(run.rejectedFixes,10);
  run=newSimulation();run=advanceSimulation(run,1,'good');
  const backup=makeBackup([{...run,endedAt:run.points.at(-1)!.timestamp}],{},1700000010000);
  assert.equal(backup.runs[0].mode,'driving');
});
