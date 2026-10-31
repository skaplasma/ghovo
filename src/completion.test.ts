import {test} from 'node:test';import assert from 'node:assert/strict';
import {completeRun} from './completion.ts';import {isComparable,type Run} from './core.ts';import {validStateValue} from './state-validation.ts';import {courseModel,initialComparison,advanceComparison,arrivalReady,selectReference} from './comparison.ts';import {makeBackup,parseBackup} from './backup.ts';
const p=(meters:number,timestamp:number,north=0)=>({latitude:north/111195,longitude:meters/111195,timestamp,accuracy:5});
const reference:Run={id:'ref',routeId:'home',name:'Casa',startedAt:0,endedAt:100000,points:Array.from({length:101},(_,i)=>p(i*10,i*1000))};
const draft:Run={id:'today',routeId:'home',name:'Casa',referenceId:'ref',startedAt:200000,points:Array.from({length:51},(_,i)=>p(i*10,200000+i*1000)),lastFixAt:250000,comparison:initialComparison(200000)};
test('manual finish far from B persists a valid incomplete recording without fictitious finish or reference',()=>{
 const saved=completeRun(draft,reference,250000);
 assert.equal(saved.incomplete,true);assert.equal(isComparable(saved),false);assert.equal(validStateValue('history',[reference,saved]),true);assert.equal(saved.comparison?.splits.length,0);assert.equal(saved.comparison?.difference,null);assert.doesNotMatch(saved.notice!.message,/Felicidades|antes|más tarde/);assert.equal(selectReference([reference,saved],'latest')?.id,'ref');
 assert.equal(parseBackup(JSON.stringify(makeBackup([reference,saved],{},300000))).runs[1].incomplete,true);
});
test('manual finish with stale GPS saves available data instead of requiring reactivation',()=>{const saved=completeRun(draft,reference,350000);assert.equal(saved.endedAt,250000);assert.equal(saved.incomplete,true);});
test('parking 45 metres from either endpoint stays within the same course',()=>{
 const points=Array.from({length:92},(_,i)=>p(45+i*10,200000+i*1000));
 const saved=completeRun({...draft,points,lastFixAt:points.at(-1)!.timestamp},reference,points.at(-1)!.timestamp);
 assert.equal(saved.incomplete,false);assert.equal(isComparable(saved),true);
});
test('automatic arrival accepts an accurate fix 45 metres to the side after route progress and dwell',()=>{
 const model=courseModel(reference);let state=initialComparison(200000);
 for(let i=1;i<=100;i++)state=advanceComparison(model,state,p(i*10,200000+i*1000),200000);
 state=advanceComparison(model,state,p(1000,301000,45),200000);state=advanceComparison(model,state,p(1000,306000,45),200000);
 assert.equal(arrivalReady(state,306000),true);
 state=advanceComparison(model,state,p(1000,307000,151),200000);assert.equal(arrivalReady(state,307000),false);
});
test('a failed minimum-data check does not mutate the draft',()=>{const short={...draft,points:[p(0,200000)],lastFixAt:200000};assert.throws(()=>completeRun(short,reference,200000),/posiciones/);assert.equal(short.endedAt,undefined);});
