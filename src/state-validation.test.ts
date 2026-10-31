import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validStateValue } from './state-validation.ts';
const draft = { id: 'one', routeId: 'route', name: 'Paseo', startedAt: 1000, points: [{ latitude: 40, longitude: -3, timestamp: 1000, accuracy: 5 }] };
const finished = { ...draft, endedAt: 2000, points: [...draft.points, { ...draft.points[0], latitude: 40.001, timestamp: 2000 }] };
test('valid legacy recordings and complete recovery snapshots remain readable', () => {
  assert.equal(validStateValue('active', draft), true); assert.equal(validStateValue('active', null), true);
  assert.equal(validStateValue('history', [finished]), true);
  assert.equal(validStateValue('recovery', { savedAt: 3000, history: [finished], routeDetails: { route: { favorite: true, note: 'Puente' } }, lastResult: 'one' }), true);
});
test('syntactically valid but damaged data cannot reach the interface or replace a recovery snapshot', () => {
  assert.equal(validStateValue('history', {}), false);
  assert.equal(validStateValue('history', [null]), false);
  assert.equal(validStateValue('history', [draft]), false);
  assert.equal(validStateValue('history', [finished, finished]), false);
  assert.equal(validStateValue('active', { ...draft, points: [{ ...draft.points[0], latitude: 100 }] }), false);
  assert.equal(validStateValue('history', [{ ...finished, points: [...finished.points].reverse() }]), false);
  assert.equal(validStateValue('routeDetails', { route: { favorite: 'yes', note: 'text' } }), false);
  assert.equal(validStateValue('recovery', { savedAt: 3000, history: [null], routeDetails: {}, lastResult: null }), false);
});
test('known GPS quality fields are validated without requiring them in old recordings', () => {
  assert.equal(validStateValue('active', { ...draft, lastFixAt: 2000, gpsGaps: 1, rejectedFixes: 2, maxGpsGapMs: 40000 }), true);
  assert.equal(validStateValue('active', { ...draft, lastFixAt: 999 }), false);
  assert.equal(validStateValue('active', { ...draft, gpsGaps: -1 }), false);
  assert.equal(validStateValue('active', { ...draft, rejectedFixes: 1.5 }), false);
});
