import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accepts,appendFix,distance,endPoints,ghostAt,length,recordingQuality,sameCourse,type Point,type Run} from './core.ts';
const p=(x:number,t=0):Point=>({latitude:40+x/111195,longitude:-3,timestamp:t,accuracy:5});
test('distance and GPS outliers',()=>{assert.ok(Math.abs(distance(p(0),p(100))-100)<1);assert.equal(accepts([p(0)],p(100,1000)),false);assert.equal(accepts([p(0)],p(3,1000)),true);assert.equal(accepts([], {...p(0),accuracy:80}),false);});
test('travel modes speed acceptance', () => {
  assert.equal(accepts([p(0)], p(20, 1000), 'bicycling'), true);
  assert.equal(accepts([p(0)], p(30, 1000), 'bicycling'), false);
  assert.equal(accepts([p(0)], p(10, 1000), 'running'), true);
  assert.equal(accepts([p(0)], p(15, 1000), 'running'), false);
});
test('ghost interpolates timestamps and clamps to end',()=>{const r:Run={id:'1',routeId:'1',name:'test',startedAt:0,endedAt:10000,points:[p(0,0),p(100,10000)]};assert.ok(distance(ghostAt(r,5000)!,p(50))<1);assert.equal(ghostAt(r,20000),r.points[1]);});
test('same course accepts different sampling and rejects reversal or omitted detours',()=>{
  const a=[p(0),p(50),p(100),p(150),p(200)];
  assert.equal(sameCourse(a,a),true);assert.equal(sameCourse(a,[...a].reverse()),false);
  assert.equal(sameCourse(a,[p(0),p(200)]),true);
  const detour=[p(0),{...p(100),longitude:-3.002},p(200)];
  assert.equal(sameCourse(detour,[p(0),p(200)]),false);
});
test('matching tolerates modest position noise without accepting a parallel distant route',()=>{
  const a=Array.from({length:101},(_,i)=>p(i*10,i*1000));
  const b=a.map((point,i)=>({...point,longitude:point.longitude+(i%2?0.00003:-0.00003)}));
  assert.equal(sameCourse(a,b),true);
  assert.equal(sameCourse(a,a.map(point=>({...point,longitude:point.longitude+0.001}))),false);
  assert.equal(sameCourse([p(0),p(0)],[p(0),p(0)]),false);
});
test('invalid geographic coordinates and antipodal distances remain safe',()=>{
  assert.equal(accepts([],{...p(0),latitude:91}),false);
  assert.equal(accepts([],{...p(0),longitude:181}),false);
  assert.ok(Number.isFinite(distance({...p(0),latitude:0,longitude:0},{...p(0),latitude:0,longitude:180})));
});
test('stationary jitter does not add distance and preserves time spent stopped',()=>{
  let r:Run={id:'1',routeId:'1',name:'test',startedAt:0,points:[p(0,0)]};
  for(let t=1000;t<=10000;t+=1000)r=appendFix(r,p(t%2000?0.5:1,t));
  assert.equal(r.points.length,1);assert.equal(length(r.points),0);assert.equal(r.lastFixAt,10000);
  r=appendFix(r,p(5,12000));
  assert.equal(r.points[1].timestamp,10000);assert.equal(r.points[2].timestamp,12000);
  assert.ok(distance(ghostAt({...r,endedAt:12000},9000)!,p(0))<0.1);
});
test('heartbeats survive a final stop, rejected outliers do not refresh good GPS time',()=>{
  let r:Run={id:'1',routeId:'1',name:'test',startedAt:0,points:[p(0,0)]};
  r=appendFix(r,p(0,5000));
  assert.equal(endPoints(r).at(-1)!.timestamp,5000);
  r=appendFix(r,p(200,6000));
  assert.equal(r.lastFixAt,5000);assert.equal(r.rejectedFixes,1);
  r=appendFix(r,p(5,40000));
  assert.equal(r.gpsGaps,1);assert.equal(r.maxGpsGapMs,35000);
  assert.equal(recordingQuality([p(0,0),p(5,40000)]).gaps,1);
});
test('ghost interpolates across the international date line along the short arc',()=>{
  const r:Run={id:'date',routeId:'date',name:'test',startedAt:0,endedAt:10000,points:[{...p(0,0),longitude:179.99},{...p(0,10000),longitude:-179.99}]};
  assert.ok(Math.abs(ghostAt(r,5000)!.longitude)>179.99);
  assert.equal(ghostAt({...r,points:[]},1000),undefined);
});
test('loops, crossings and out-and-back routes remain comparable with ordinary GPS noise',()=>{
  for(const shape of ['circle','eight','outback']) {
    const a=Array.from({length:101},(_,i)=>{
      const f=i/100,t=f*Math.PI*2;
      const x=shape==='circle'?150*Math.cos(t):shape==='eight'?150*Math.sin(t):f<=0.5?f*1000:1000-f*1000;
      const y=shape==='circle'?150*Math.sin(t):shape==='eight'?150*Math.sin(2*t):0;
      return {...p(y,i*3000),longitude:-3+x/85180};
    });
    const b=a.map((point,i)=>({...point,latitude:point.latitude+Math.sin(i*.07)*5/111195,longitude:point.longitude+Math.cos(i*.11)*5/85180}));
    assert.equal(sameCourse(a,b),true,shape);
    if(shape!=='outback')assert.equal(sameCourse(a,[...b].reverse()),false,`${shape} reversed`);
  }
});
