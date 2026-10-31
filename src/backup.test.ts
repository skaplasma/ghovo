import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeBackup, mergeBackup, parseBackup, runToGpx, utf8Bytes } from './backup.ts';
import type { Run } from './core.ts';
const route: Run = { id: 'run-1', routeId: 'route-1', name: 'Río & <puente>', startedAt: 1000, endedAt: 2000, points: [{ latitude: 40, longitude: -3, timestamp: 1000, accuracy: 5 }, { latitude: 40.001, longitude: -3, timestamp: 2000, accuracy: 5 }] };
test('backup round trip includes notes/favorites and excludes unfinished runs', () => {
  const backup=makeBackup([route,{...route,id:'pending',endedAt:undefined}],{'route-1':{favorite:true,note:'Puente de madera'}},3000);
  assert.equal(backup.runs.length,1);assert.equal(backup.routeDetails['route-1'].note,'Puente de madera');
  assert.deepEqual(parseBackup(JSON.stringify(backup)),backup);
});
test('invalid coordinates, chronology, duplicated IDs and unsupported formats are rejected',()=>{
  const base=makeBackup([route],{},3000);
  assert.throws(()=>parseBackup('{broken'));
  assert.throws(()=>parseBackup(JSON.stringify({...base,version:5})));
  assert.throws(()=>parseBackup(JSON.stringify({...base,runs:[route,route]})));
  assert.throws(()=>parseBackup(JSON.stringify({...base,runs:[{...route,points:[{...route.points[0],latitude:91},route.points[1]]}]})));
  assert.throws(()=>parseBackup(JSON.stringify({...base,runs:[{...route,points:[route.points[1],route.points[0]]}]})));
  assert.throws(()=>parseBackup(JSON.stringify({...base,runs:[{...route,id:'__proto__'}]})));
});
test('merge never replaces local attempts or notes and repeated import is idempotent',()=>{
  const backup=makeBackup([route],{'route-1':{favorite:true,note:'importada'}},3000);
  const first=mergeBackup([],{},backup);
  assert.equal(first.added,1);
  const next=mergeBackup(first.runs,{'route-1':{favorite:false,note:'local'}},backup);
  assert.equal(next.added,0);assert.equal(next.skipped,1);assert.equal(next.routeDetails['route-1'].note,'local');
});
test('unrelated route-ID collision is imported as its own course',()=>{
  const backup=makeBackup([{...route,id:'new'}],{},3000);
  const merged=mergeBackup([route],{},backup);
  assert.notEqual(merged.runs[0].routeId,merged.runs[1].routeId);
});
test('GPX escapes user supplied names and retains ordered coordinates/timestamps',()=>{
  const xml=runToGpx(route);
  assert.ok(xml.includes('Río &amp; &lt;puente&gt;'));assert.ok(xml.includes('1970-01-01T00:00:01.000Z'));
  assert.ok(xml.indexOf('lat="40"')<xml.indexOf('lat="40.001"'));
  assert.throws(()=>runToGpx({...route,endedAt:undefined}));
});
test('later backups extend a previously imported colliding route without splitting it',()=>{
  const imported={...route,id:'imported-original',startedAt:3000,endedAt:4000,points:route.points.map(p=>({...p,timestamp:p.timestamp+2000}))};
  const first=mergeBackup([route],{},makeBackup([imported],{'route-1':{favorite:true,note:'Importada'}},5000));
  const firstRoute=first.runs.find(r=>r.id===imported.id)!.routeId;
  const later={...imported,id:'imported-repeat',startedAt:6000,endedAt:7000,points:imported.points.map(p=>({...p,timestamp:p.timestamp+3000}))};
  const second=mergeBackup(first.runs,first.routeDetails,makeBackup([imported,later],{},8000));
  assert.equal(second.added,1);assert.equal(second.runs.find(r=>r.id===later.id)!.routeId,firstRoute);
  assert.equal(second.routeDetails[firstRoute].note,'Importada');assert.notEqual(firstRoute,route.routeId);
});
test('backup size uses UTF-8 bytes for accented names and emoji',()=>{
  const text='Río 👻 森';assert.equal(utf8Bytes(text),Buffer.byteLength(text,'utf8'));
  const backup=makeBackup([{...route,name:text}],{},3000);
  assert.equal(parseBackup(JSON.stringify(backup)).runs[0].name,text);
});
