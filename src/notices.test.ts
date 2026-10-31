import assert from 'node:assert/strict';
import {test} from 'node:test';
import {checkpointNotice,arrivalNotice,validNotice} from './notices.ts';
import type {Run} from './core.ts';
import {makeBackup,parseBackup} from './backup.ts';
const reference:Run={id:'ref',routeId:'commute',name:'Casa',mode:'driving',startedAt:0,endedAt:9000,points:[{latitude:0,longitude:0,timestamp:0,accuracy:5},{latitude:0,longitude:0.001,timestamp:9000,accuracy:5}]};
const run:Run={...reference,id:'today',referenceId:'ref',startedAt:100000,endedAt:110000,points:reference.points.map(p=>({...p,timestamp:p.timestamp+100000})),voiceEnabled:true};
test('checkpoint notices use neutral differences and never invent a missing time',()=>{
  const event=checkpointNotice(run,{meters:5000,elapsed:101000,referenceElapsed:89000,difference:12000},110000);
  assert.equal(event.title,'Control · Km 5');assert.match(event.message,/12 segundos más/);assert.ok(validNotice(event));
  assert.match(checkpointNotice(run,{meters:5000,elapsed:null,referenceElapsed:89000,difference:null},110000).message,/Sin comparación fiable/);
});
test('arrival says before or later and omits comparison for incomplete GPS',()=>{
  assert.match(arrivalNotice(run,reference).message,/1 segundo más tarde/);
  assert.match(arrivalNotice({...run,endedAt:108000},reference).message,/1 segundo antes/);
  assert.equal(arrivalNotice({...run,gpsGaps:1},reference).message,'Felicidades, has llegado. Ruta guardada.');
});
test('voice preference and notices survive manual backup',()=>{
  const withNotice={...run,notice:arrivalNotice(run,reference)};
  const backup=parseBackup(JSON.stringify(makeBackup([reference,withNotice],{commute:{favorite:true,note:'',voiceEnabled:false}},200000)));
  assert.equal(backup.routeDetails.commute.voiceEnabled,false);assert.equal(backup.runs[1].voiceEnabled,true);assert.deepEqual(backup.runs[1].notice,withNotice.notice);
});
