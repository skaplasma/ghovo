import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activityTotals, resultFor, filterRoutes, tripFacts, routeFacts } from './results.ts';
import type { Run } from './core.ts';
const run = (id: string, start: number, time: number, name = 'Río'): Run => ({id,routeId:'route',name,startedAt:start,endedAt:start+time,points:[]});
test('route information uses a median and excludes other modes, drafts and GPS gaps from times',()=>{
  const sample=(id:string,start:number,time:number):Run=>({...run(id,start,time),mode:'driving',points:[{latitude:40,longitude:-3,timestamp:start,accuracy:5},{latitude:40.0001,longitude:-3,timestamp:start+1000,accuracy:5}]});
  const a=sample('a',0,10000),b=sample('b',20000,20000),outlier=sample('c',50000,300000),broken={...sample('broken',400000,5000),gpsGaps:1};
  const attempts=[outlier,a,broken,b,{...sample('walking',600000,1000),mode:'walking' as const},{...sample('draft',700000,1000),endedAt:undefined},{...sample('other',800000,1000),routeId:'another'}];
  const original=structuredClone(attempts),facts=routeFacts(a,attempts);
  assert.equal(facts.count,4);assert.equal(facts.validCount,3);
  assert.equal(facts.typical,20000);assert.equal(facts.best,10000);
  assert.equal(facts.first,0);assert.equal(facts.latest,400000);
  assert.ok(facts.meters>40&&facts.meters<50);
  assert.deepEqual(attempts,original);
  assert.equal(routeFacts(a,[a,b]).typical,15000);
});
test('route information has explicit empty values when no usable times exist',()=>{
  const empty=run('empty',1000,2000);
  assert.deepEqual(routeFacts(empty,[]),{count:0,validCount:0,best:null,typical:null,meters:0,first:null,latest:null});
  const facts=routeFacts(empty,[empty]);
  assert.equal(facts.count,1);assert.equal(facts.best,null);assert.equal(facts.typical,null);
});
test('trip average includes all elapsed time, including a stop before arrival',()=>{
  const trip={...run('trip',0,20000),points:[{latitude:0,longitude:0,timestamp:0,accuracy:4},{latitude:0.0009,longitude:0,timestamp:10000,accuracy:6}]};
  const original=structuredClone(trip);
  assert.ok(Math.abs(tripFacts(trip).averageSpeed!-18)<0.1);
  assert.equal(tripFacts(trip).accuracy,5);
  assert.deepEqual(trip,original);
});
test('missing, unfinished and interrupted traces never produce a misleading average',()=>{
  const trip={...run('trip',0,60000),points:[{latitude:0,longitude:0,timestamp:0,accuracy:5},{latitude:0.009,longitude:0,timestamp:60000,accuracy:5}]};
  assert.equal(tripFacts(trip).averageSpeed,null);
  assert.equal(tripFacts({...trip,gpsGaps:1}).gaps,1);
  assert.equal(tripFacts({...trip,endedAt:undefined}).averageSpeed,null);
  assert.equal(tripFacts(run('empty',0,1000)).accuracy,null);
  assert.equal(tripFacts(run('empty',0,1000)).averageSpeed,null);
});
test('driving attempts never compete with walking or unknown legacy travel modes',()=>{
  const legacy=run('legacy',0,10000),walking={...run('walk',20000,15000),mode:'walking' as const};
  const driving={...run('car',40000,5000),mode:'driving' as const};
  assert.equal(resultFor(driving,[legacy,walking,driving]).status,'first');
  const second={...run('car2',60000,4500),mode:'driving' as const};
  assert.equal(resultFor(second,[legacy,walking,driving,second]).difference,-500);
});
test('first, record, tie and slower compare only to earlier attempts', () => {
  const a=run('a',0,1000), b=run('b',2000,800), c=run('c',4000,800), d=run('d',6000,900);
  const history=[a,b,c,d];
  assert.equal(resultFor(a,history).status,'first');
  assert.equal(resultFor(b,history).difference,-200);
  assert.equal(resultFor(b,history).status,'record');
  assert.equal(resultFor(c,history).status,'tie');
  assert.equal(resultFor(d,history).status,'completed');
  assert.equal(resultFor(d,history).difference,100);
});
test('search ignores accents and recent order uses latest attempt', () => {
  const a={reference:run('a',0,1000),latest:run('b',4000,800)};
  const b={reference:run('c',2000,800,'Parque'),latest:run('c',2000,800,'Parque')};
  assert.deepEqual(filterRoutes([b,a],'rio','name'),[a]);
  assert.deepEqual(filterRoutes([b,a],'','recent'),[a,b]);
  assert.equal(filterRoutes([a,b],'ninguna','recent').length,0);
});
test('activity counts repeats but excludes an unfinished recording', () => {
  const a=run('a',0,60000), b={...run('b',100000,120000),routeId:'second'};
  const draft={...run('draft',200000,1000),endedAt:undefined};
  const totals=activityTotals([a,b,draft]);
  assert.equal(totals.attempts,2);
  assert.equal(totals.routes,2);
  assert.equal(totals.milliseconds,180000);
  assert.equal(totals.days,1);
  assert.deepEqual(activityTotals([]),{routes:0,attempts:0,meters:0,milliseconds:0,days:0});
});
test('known GPS gaps cannot establish or lower the previous personal best',()=>{
  const first=run('a',0,1000),interrupted={...run('b',2000,500),gpsGaps:1},last=run('c',4000,900);
  assert.equal(resultFor(interrupted,[first,interrupted,last]).status,'incomplete');
  assert.equal(resultFor(last,[first,interrupted,last]).status,'record');
  assert.equal(resultFor(last,[first,interrupted,last]).difference,-100);
});
