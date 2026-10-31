import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {Run} from './core.ts';
import {initialComparison} from './comparison.ts';
import {alternativesFor,compareTrips,estimatedCost,monthlyTrend,planDeparture,routeReportCsv,routeTrips,summarizeTrips,timeGroups} from './premium.ts';
const minute=60000,base=new Date(2026,9,20,8).getTime(),now=new Date(2026,9,24,6).getTime();
const sample=(id:string,start=base,time=10*minute):Run=>{
  const count=Math.ceil(time/10000)+1;
  return {id,routeId:'commute',name:'Casa → Trabajo',mode:'driving',startedAt:start,endedAt:start+time,points:Array.from({length:count},(_,i)=>({latitude:40+i/(count-1)*0.01,longitude:-3,timestamp:start+i/(count-1)*time,accuracy:5}))};
};
const history=()=>[sample('a'),sample('b',base+86400000,12*minute),sample('c',base+2*86400000,20*minute)];
test('periods isolate a route and mode, exclude future trips and unfinished data, and never mutate history',()=>{
  const a=sample('a'),runs=[a,{...sample('other'),routeId:'other'},{...sample('walk'),mode:'walking' as const},{...sample('draft'),endedAt:undefined},sample('old',base-100*86400000),sample('future',now+86400000)];
  const original=structuredClone(runs);
  assert.deepEqual(routeTrips(a,runs,7,now).map(item=>item.id),['a']);
  assert.deepEqual(routeTrips(a,runs,'all',now).map(item=>item.id),['old','a']);
  assert.deepEqual(runs,original);
});
test('median and P80 remain historical values and exclude GPS gaps and empty traces',()=>{
  const runs=history(),broken={...sample('broken'),gpsGaps:1},empty={...sample('empty'),points:[]};
  const stats=summarizeTrips([...runs,broken,empty]);
  assert.equal(stats.typical,12*minute);assert.equal(stats.p80,20*minute);assert.equal(stats.excluded,2);assert.equal(stats.days,3);
  assert.equal(summarizeTrips([]).typical,null);assert.equal(summarizeTrips([]).p80,null);
});
test('day and hour groups use local departure dates and trends keep years separate',()=>{
  const runs=history();
  const groups=timeGroups(runs,'hour');assert.equal(groups.length,1);assert.equal(groups[0].key,8);assert.equal(groups[0].count,3);assert.equal(groups[0].days,3);
  assert.equal(timeGroups(runs,'weekday').length,3);
  assert.deepEqual(monthlyTrend([runs[0],sample('next',new Date(2027,9,20,8).getTime())]).map(item=>item.key),['2026-10','2027-10']);
});
test('planning requires repeated days, valid clock time and a departure still in the future',()=>{
  const runs=history(),result=planDeparture(runs,'09:00',1,10,now);
  assert.ok('departure' in result);
  if('departure' in result){assert.equal(result.arrival-result.departure,30*minute);assert.equal(new Date(result.arrival).getDate(),25);assert.equal(result.sample,3);}
  assert.ok('error' in planDeparture(runs.slice(0,2),'09:00',1,10,now));
  assert.ok('error' in planDeparture([runs[0],sample('d'),sample('e')],'09:00',1,10,now));
  for(const invalid of ['24:00','9:00','12:99','bad'])assert.ok('error' in planDeparture(runs,invalid,1,10,now));
  assert.ok('error' in planDeparture(runs,'05:00',0,10,now));
  assert.ok('error' in planDeparture(runs,'06:05',0,10,now));
  assert.ok('error' in planDeparture(runs,'09:00',1,-1,now));
});
test('fuel estimates accept decimal commas and reject missing, invalid or excessive values',()=>{
  assert.deepEqual(estimatedCost(100000,'6,5','1,60'),{liters:6.5,cost:10.4});
  for(const invalid of ['','-1','Infinity','6abc','61'])assert.equal(estimatedCost(1000,invalid,'1.5'),null);
  assert.equal(estimatedCost(1000,'6','11'),null);assert.equal(estimatedCost(NaN,'6','1'),null);
});
test('alternative routes need nearby ordered endpoints, same mode, enough days, and sufficient separation',()=>{
  const reference=sample('ref'),alts=history().map(run=>({...run,routeId:'alternative'}));
  const reverse=history().map(run=>({...run,id:run.id+'r',routeId:'reverse',points:[...run.points].reverse().map((p,i)=>({...p,timestamp:run.startedAt+i*10000}))}));
  assert.deepEqual(alternativesFor(reference,[...alts,...reverse],30,now).map(item=>item.route.routeId),['alternative']);
  assert.equal(alternativesFor(reference,alts.slice(0,2),30,now).length,0);
  assert.equal(alternativesFor(reference,alts.map(run=>({...run,mode:'walking' as const})),30,now).length,0);
  assert.equal(alternativesFor({...reference,points:[reference.points[0],reference.points[0]]},alts,30,now).length,0);
});
test('trip comparisons reject self, other modes and unreliable recordings',()=>{
  const [a,b]=history();assert.equal(compareTrips(a,b)?.difference,2*minute);
  assert.equal(compareTrips(a,a),null);assert.equal(compareTrips(a,{...b,mode:'walking'}),null);assert.equal(compareTrips(a,{...b,gpsGaps:1}),null);
});
test('checkpoint comparisons require the same reference, distance and reference time and preserve missing data',()=>{
  const [a,b]=history();
  a.referenceId=b.referenceId='reference';
  a.comparison={...initialComparison(a.startedAt),splits:[{meters:2000,elapsed:100000,referenceElapsed:110000,difference:-10000},{meters:4000,elapsed:null,referenceElapsed:200000,difference:null}]};
  b.comparison={...initialComparison(b.startedAt),splits:[{meters:2000,elapsed:120000,referenceElapsed:110000,difference:10000},{meters:4000,elapsed:230000,referenceElapsed:200000,difference:30000}]};
  const controls=compareTrips(a,b)!.checkpoints;
  assert.equal(controls.length,2);assert.equal(controls[0].difference,20000);assert.equal(controls[1].difference,null);
  assert.equal(compareTrips(a,{...b,referenceId:'other'})!.checkpoints.length,0);
});
test('CSV escapes formulas and delimiters and does not contain GPS coordinates or unrelated trips',()=>{
  const a={...sample('a'),name:'=SUM(1;2)\n"ruta"'},report=routeReportCsv(a,[a,{...sample('private'),routeId:'other',name:'Otro destino privado'}]);
  assert.ok(report.startsWith('\uFEFF'));assert.ok(report.includes('"\'=SUM(1;2)'));
  assert.ok(report.includes('""ruta""'));assert.ok(!report.includes('Otro destino privado'));assert.ok(!report.includes('latitude'));assert.ok(!report.includes('longitude'));assert.ok(!report.includes('40.000166'));
});
