import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stableFixes,fixReady} from './gps-quality.ts';
import type {Point} from './core.ts';
const point=(timestamp:number,longitude=0,accuracy=5):Point=>({timestamp,latitude:0,longitude,accuracy});
test('three coherent distinct fixes over two seconds prepare GPS',()=>{
 let samples:Point[]=[];for(const time of [1000,2000,3000])samples=stableFixes(samples,point(time));
 assert.equal(fixReady(samples),true);
});
test('duplicate cached positions, bursts, poor accuracy, and jumps cannot fake stability',()=>{
 let samples:Point[]=[];for(let i=0;i<5;i++)samples=stableFixes(samples,point(1000));assert.equal(fixReady(samples),false);
 samples=stableFixes(samples,point(1100));assert.equal(samples.length,1);
 samples=stableFixes(samples,point(2000,1));assert.equal(samples.length,1);
 samples=stableFixes(samples,point(3000,1,100));assert.equal(samples.length,0);
 samples=[point(1000),point(2000)];samples=stableFixes(samples,point(10000));assert.equal(fixReady(samples),false);
});

test('small timestamp jitter does not leave valid GPS permanently checking stability',()=>{
 let samples:Point[]=[];for(const time of [1000,1999,2998,3997])samples=stableFixes(samples,point(time));
 assert.equal(fixReady(samples),true);
});
