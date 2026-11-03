import {test} from 'node:test';import assert from 'node:assert/strict';
import {routeEntry,referenceForRun} from './route-entry.ts';import {completeRun} from './completion.ts';import {courseModel,advanceComparison,initialComparison,arrivalReady,destinationRadius} from './comparison.ts';import {ghostAt,isComparable,isFullCourse,type Run} from './core.ts';
const p=(m:number,t:number)=>({latitude:0,longitude:m/111195,timestamp:t,accuracy:5});
const reference:Run={id:'ref',routeId:'road',name:'Casa',startedAt:0,endedAt:100000,points:Array.from({length:101},(_,i)=>p(i*10,i*1000))};
test('joining midway matches the road, not the start radius, and aligns the reference clock',()=>{
 const entry=routeEntry(reference,p(400,200000))!;assert.ok(entry.offset>39000&&entry.offset<41000);const run={...reference,id:'joined',startedAt:200000,referenceOffsetMs:entry.offset};const tail=referenceForRun(run,reference)!;assert.ok(Math.abs(tail.points[0].longitude-p(400,0).longitude)<1e-10);assert.equal(tail.startedAt,entry.offset);assert.equal(isComparable(run),true);assert.equal(isFullCourse(run),false);assert.equal(reference.points.length,101);
 assert.equal(routeEntry(reference,{...p(400,200000),latitude:.01}),undefined);assert.equal(routeEntry(reference,p(990,200000)),undefined);
});
test('joining midway: the ghost starts at the join and the attempt saves as verified',()=>{
 const entry=routeEntry(reference,p(400,200000))!;
 const tail=referenceForRun({...reference,startedAt:200000,referenceOffsetMs:entry.offset},reference)!;
 // El fantasma en el segundo 0 está exactamente en el punto de incorporación.
 assert.ok(Math.abs(ghostAt(tail,0)!.longitude-p(400,0).longitude)<1e-10);
 const model=courseModel(tail);let state=initialComparison(200000);
 const points=Array.from({length:81},(_,i)=>p(400+i*10,200000+i*1000));
 for(const point of points)state=advanceComparison(model,state,point,200000);
 // Termina 200 m más allá de B, como al aparcar en una calle lateral.
 const run:Run={id:'joined-end',routeId:'road',name:'Casa',startedAt:200000,circuitStartedAt:200000,referenceId:'ref',referenceOffsetMs:entry.offset,points,comparison:state,lastFixAt:points.at(-1)!.timestamp};
 const saved=completeRun(run,reference,points.at(-1)!.timestamp,true);
 assert.equal(saved.incomplete,false);assert.equal(isComparable(saved),true);assert.equal(saved.comparison?.unavailable,false);
});
test('arrival requires being stopped near B; driving through it never satisfies the dwell',()=>{
 const model=courseModel(reference);let state=initialComparison(200000);
 for(let i=1;i<=100;i++)state=advanceComparison(model,state,p(i*10,200000+i*1000),200000,10);
 assert.equal(arrivalReady(state,300000),false);
 state=advanceComparison(model,state,p(1000,301000),200000,0);state=advanceComparison(model,state,p(1000,306000),200000,0);assert.equal(arrivalReady(state,306000),true);
 state=advanceComparison(model,state,p(1000,307000),200000,4);assert.equal(arrivalReady(state,307000),false);
});

test('the destination area accepts nearby parking at 120 m but rejects a position 260 m away',()=>{
 const model=courseModel(reference);let state=initialComparison(200000);
 for(let i=1;i<=100;i++)state=advanceComparison(model,state,p(i*10,200000+i*1000),200000,10);
 const parked={...p(1000,301000),latitude:120/111195,accuracy:12};
 state=advanceComparison(model,state,parked,200000,0);state=advanceComparison(model,state,{...parked,timestamp:306000,latitude:127/111195},200000,0);
 assert.equal(arrivalReady(state,306000),true);assert.equal(destinationRadius(model.total),150);
 state=advanceComparison(model,state,{...parked,timestamp:307000,latitude:260/111195},200000,0);assert.equal(arrivalReady(state,307000),false);
});

test('a short loop cannot finish merely by waiting at its origin inside the destination area',()=>{
 const loop={...reference,points:[p(0,0),p(40,10000),p(0,20000)],endedAt:20000};const model=courseModel(loop);let state=initialComparison(100000);
 state=advanceComparison(model,state,p(0,101000),100000,0);state=advanceComparison(model,state,p(0,107000),100000,0);
 assert.equal(model.valid,true);assert.equal(destinationRadius(model.total),60);assert.equal(arrivalReady(state,107000),false);
});
test('parking 200 m past the finish completes the route; stopping 200 m before it does not',()=>{
 const model=courseModel(reference);
 let state=initialComparison(200000);
 for(let i=1;i<=100;i++)state=advanceComparison(model,state,p(i*10,200000+i*1000),200000,10);
 const beyond={...p(1000,301000),longitude:1200/111195,accuracy:8};
 state=advanceComparison(model,state,beyond,200000,0);
 state=advanceComparison(model,state,{...beyond,timestamp:306000},200000,0);
 assert.equal(arrivalReady(state,306000),true);
 let early=initialComparison(200000);
 for(let i=1;i<=80;i++)early=advanceComparison(model,early,p(i*10,200000+i*1000),200000,10);
 const stop={...p(800,301000),accuracy:8};
 early=advanceComparison(model,early,stop,200000,0);
 early=advanceComparison(model,early,{...stop,timestamp:306000},200000,0);
 assert.equal(arrivalReady(early,306000),false);
});
