import {test} from 'node:test';import assert from 'node:assert/strict';
import {motionDuration,interpolateDisplayPoint} from './map-motion.ts';
const first=Object.freeze({latitude:40,longitude:-3,timestamp:1000,accuracy:5});
test('visual interpolation stays between samples and does not change recorded coordinates',()=>{
 const next=Object.freeze({...first,latitude:40.0001,timestamp:2000});
 const middle=interpolateDisplayPoint(first,next,0.5);
 assert.ok(Math.abs(middle.latitude-40.00005)<1e-9);assert.equal(middle.longitude,-3);assert.equal(first.latitude,40);assert.equal(next.latitude,40.0001);assert.equal(interpolateDisplayPoint(first,next,2),next);assert.equal(motionDuration(first,next),1000);
});
test('visual motion never fills GPS gaps, teleports, backwards time or stationary updates',()=>{
 assert.equal(motionDuration(undefined,first),0);
 for(const next of [{...first,timestamp:10000,latitude:40.001},{...first,timestamp:2000,latitude:41},{...first,timestamp:0,latitude:40.0001},{...first,timestamp:2000}])assert.equal(motionDuration(first,next),0);
 assert.equal(motionDuration(first,{...first,timestamp:1100,latitude:40.00001}),250);
});
test('longitude interpolation crosses the dateline by the short route',()=>{
 const middle=interpolateDisplayPoint({...first,longitude:179.999},{...first,longitude:-179.999},0.5);assert.ok(Math.abs(middle.longitude)>179.99);
});
