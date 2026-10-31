import {validNotice} from './notices.ts';
import {validComparison,validReferenceChoice} from './comparison.ts';
import {validCheckpointInterval} from './checkpoints.ts';
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const time = (value: unknown): value is number => finite(value) && value >= 0 && value < 8640000000000000;
const id = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 160 && !['__proto__', 'constructor', 'prototype'].includes(value);
function run(value: unknown, completed: boolean): boolean {
  if (!record(value) || !id(value.id) || !id(value.routeId) || typeof value.name !== 'string' || !value.name.trim() || value.name.length > 60 || !time(value.startedAt) || !Array.isArray(value.points)) return false;
  if (completed ? !time(value.endedAt) || value.endedAt < value.startedAt || value.points.length < 2 : value.endedAt !== undefined) return false;
  if(value.voiceEnabled!==undefined&&typeof value.voiceEnabled!=='boolean'||value.notice!==undefined&&!validNotice(value.notice))return false;
  if(value.incomplete!==undefined&&typeof value.incomplete!=='boolean')return false;
  if(value.referenceOffsetMs!==undefined&&(!finite(value.referenceOffsetMs)||value.referenceOffsetMs<0||value.referenceOffsetMs>8640000000000000))return false;
  if(value.circuitStartedAt!==undefined&&(!time(value.circuitStartedAt)||value.circuitStartedAt<value.startedAt))return false;
  if(value.referenceId!==undefined&&!id(value.referenceId)||value.checkpointKm!==undefined&&value.checkpointKm!==null&&!validCheckpointInterval(value.checkpointKm)||value.autoFinish!==undefined&&typeof value.autoFinish!=='boolean'||value.autoCompleted!==undefined&&typeof value.autoCompleted!=='boolean'||value.comparison!==undefined&&!validComparison(value.comparison))return false;
  if(value.mode!==undefined&&value.mode!=='walking'&&value.mode!=='driving')return false;
  let previous = -1;
  for (const point of value.points) {
    if (!record(point) || !finite(point.latitude) || Math.abs(point.latitude) > 90 || !finite(point.longitude) || Math.abs(point.longitude) > 180 || !time(point.timestamp) || point.timestamp < value.startedAt || point.timestamp <= previous || (completed && point.timestamp > (value.endedAt as number)) || !finite(point.accuracy) || point.accuracy < 0 || point.accuracy > 10000) return false;
    previous = point.timestamp;
  }
  if(value.lastAccuracy!==undefined&&(!finite(value.lastAccuracy)||value.lastAccuracy<0||value.lastAccuracy>25))return false;
  if (value.lastFixAt !== undefined && (!time(value.lastFixAt) || value.lastFixAt < Math.max(value.startedAt, previous))) return false;
  if (value.error !== undefined && typeof value.error !== 'string') return false;
  for (const key of ['gpsGaps', 'maxGpsGapMs', 'rejectedFixes']) if (value[key] !== undefined && (!finite(value[key]) || value[key] < 0 || !Number.isInteger(value[key]))) return false;
  return true;
}
function details(value: unknown): boolean {
  return record(value) && Object.entries(value).every(([key, detail]) => id(key) && record(detail) && typeof detail.favorite === 'boolean' && typeof detail.note === 'string' && detail.note.length <= 1000 && (detail.voiceEnabled===undefined||typeof detail.voiceEnabled==='boolean') && (detail.referenceChoice===undefined||validReferenceChoice(detail.referenceChoice)) && (detail.autoFinish===undefined||typeof detail.autoFinish==='boolean') && (detail.checkpointKm===undefined||detail.checkpointKm===null||validCheckpointInterval(detail.checkpointKm)));
}
export function validStateValue(key: string, value: unknown): boolean {
  if(key==='gpsDiagnostics')return Array.isArray(value)&&value.length<=200&&value.every(item=>record(item)&&time(item.at)&&typeof item.code==='string'&&/^[a-z_]{1,40}$/.test(item.code)&&(item.accuracy===undefined||finite(item.accuracy)&&item.accuracy>=0&&item.accuracy<=10000));
  if (key === 'active') return value === null || run(value, false);
  if (key === 'history') return Array.isArray(value) && value.every(item => run(item, true)) && new Set(value.map(item => item.id)).size === value.length;
  if(key==='pendingRecordings')return Array.isArray(value)&&value.every(item=>run(item,false))&&new Set(value.map(item=>item.id)).size===value.length;
  if (key === 'routeDetails') return details(value);
  if (key === 'lastResult') return value === null || id(value);
  if (key === 'recovery') return value === null || (record(value) && time(value.savedAt) && validStateValue('history', value.history) && details(value.routeDetails) && validStateValue('lastResult', value.lastResult));
  return true;
}
