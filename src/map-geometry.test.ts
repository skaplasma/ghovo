import {test} from 'node:test';
import assert from 'node:assert/strict';
import {courseBounds} from './map-geometry.ts';
const p=(latitude:number,longitude:number)=>({latitude,longitude,timestamp:0,accuracy:5});
test('bounds include all points and a nonzero margin for a single coordinate',()=>{
  assert.equal(courseBounds([]),null);
  const b=courseBounds([p(40,-3),p(41,-2)])!;
  assert.ok(b[0]<-3&&b[1]<40&&b[2]>-2&&b[3]>41);
  const single=courseBounds([p(40,-3)])!;assert.ok(single[0]<single[2]&&single[1]<single[3]);
});
test('large tracks avoid function argument limits and geographic edges are clamped',()=>{
  const points=Array.from({length:150000},()=>p(90,180));
  const b=courseBounds(points)!;assert.equal(b[2],180);assert.equal(b[3],90);
});
