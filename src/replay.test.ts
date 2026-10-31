import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changeReplayRate, seekReplay, replayTime, stopReplay, toggleReplay } from './replay.ts';
test('pause and resume preserve elapsed position', () => {
  let state = toggleReplay({offset:0,startedAt:null},1000,10000);
  state = toggleReplay(state,3500,10000);
  assert.equal(replayTime(state,9000,10000),2500);
  state = toggleReplay(state,9000,10000);
  assert.equal(replayTime(state,10000,10000),3500);
});
test('completion clamps and play restarts', () => {
  const state = {offset:0,startedAt:1000};
  assert.equal(replayTime(state,50000,10000),10000);
  assert.deepEqual(toggleReplay(state,50000,10000),{offset:0,startedAt:50000});
});
test('background pause freezes playback and restart stays at A', () => {
  const state = stopReplay({offset:1000,startedAt:1000},3000,10000);
  assert.equal(replayTime(state,90000,10000),3000);
  assert.equal(replayTime({offset:0,startedAt:null},90000,10000),0);
});
test('speed changes preserve position and pause retains speed', () => {
  let state = changeReplayRate({offset:0,startedAt:1000},4,3000,30000);
  assert.equal(replayTime(state,3000,30000),2000);
  assert.equal(replayTime(state,4000,30000),6000);
  state = stopReplay(state,4000,30000);
  assert.equal(replayTime(state,9000,30000),6000);
  state = toggleReplay(state,9000,30000);
  assert.equal(replayTime(state,10000,30000),10000);
});
test('seeking respects paused and playing states, boundaries and completion', () => {
  const paused = seekReplay({offset:0,startedAt:null},5000,1000,10000);
  assert.equal(replayTime(paused,5000,10000),5000);
  const playing = seekReplay({offset:0,startedAt:1000,rate:2},5000,2000,10000);
  assert.equal(replayTime(playing,3000,10000),7000);
  assert.equal(seekReplay(playing,50000,3000,10000).startedAt,null);
  assert.equal(seekReplay(paused,-100,3000,10000).offset,0);
  assert.equal(seekReplay({offset:0,startedAt:0},5000,20000,10000).startedAt,null);
});
