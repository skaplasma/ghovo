import {validNotice} from './notices.ts';
import {validComparison,validReferenceChoice} from './comparison.ts';
import {validCheckpointInterval} from './checkpoints.ts';
import { type Point, type Run } from './core.ts';
import { type RouteDetails } from './results.ts';
import {traceSegments} from './trace.ts';

export const MAX_BACKUP_BYTES = 30 * 1024 * 1024;
export function utf8Bytes(text: string): number {
  let bytes = 0;
  for (const character of text) {
    const code = character.codePointAt(0)!;
    bytes += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4;
  }
  return bytes;
}
export type Backup = { format: 'ghovo-backup'; version: 1; createdAt: number; runs: Run[]; routeDetails: RouteDetails };
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const validId = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{0,159}$/.test(v) && !['constructor', 'prototype', '__proto__'].includes(v);
const validTime = (v: unknown): v is number => finite(v) && v >= 0 && v < 8640000000000000;
function invalid(message: string): never { throw Error(`Copia de GHOVO no válida: ${message}`); }
export function parseBackup(text: string): Backup {
  if (text.length > MAX_BACKUP_BYTES || utf8Bytes(text) > MAX_BACKUP_BYTES) invalid('el archivo supera el tamaño máximo de 30 MB.');
  let data: unknown;
  try { data = JSON.parse(text); } catch { invalid('el archivo no contiene JSON legible.'); }
  if (!object(data) || data.format !== 'ghovo-backup' || data.version !== 1) invalid('formato o versión no compatibles.');
  if (!validTime(data.createdAt) || !Array.isArray(data.runs) || data.runs.length > 5000 || !object(data.routeDetails)) invalid('estructura incompleta.');
  const ids = new Set<string>();
  let pointCount = 0;
  const runs: Run[] = data.runs.map((raw: unknown) => {
    if (!object(raw) || !validId(raw.id) || !validId(raw.routeId) || typeof raw.name !== 'string' || !raw.name.trim() || raw.name.length > 60) invalid('nombre o identificador de ruta incorrecto.');
    if (ids.has(raw.id)) invalid('hay intentos con identificadores repetidos.');
    ids.add(raw.id);
    if (!validTime(raw.startedAt) || !validTime(raw.endedAt) || raw.endedAt < raw.startedAt || !Array.isArray(raw.points) || raw.points.length < 2) invalid('un intento está incompleto.');
    pointCount += raw.points.length;
    if (pointCount > 250000) invalid('demasiados puntos GPS para una sola importación.');
    let previous = -1;
    const start = raw.startedAt, end = raw.endedAt;
    const points: Point[] = raw.points.map((p: unknown) => {
      if (!object(p) || !finite(p.latitude) || Math.abs(p.latitude) > 90 || !finite(p.longitude) || Math.abs(p.longitude) > 180 || !validTime(p.timestamp) || p.timestamp < start || p.timestamp > end || p.timestamp <= previous || !finite(p.accuracy) || p.accuracy < 0 || p.accuracy > 10000) invalid('coordenadas, tiempos o precisión GPS incorrectos.');
      previous = p.timestamp;
      return { latitude: p.latitude, longitude: p.longitude, timestamp: p.timestamp, accuracy: p.accuracy };
    });
    const run:Run={ id: raw.id, routeId: raw.routeId, name: raw.name.trim(), startedAt: start, endedAt: end, points };
    if(raw.mode!==undefined){if(raw.mode!=='walking'&&raw.mode!=='driving')invalid('modo de desplazamiento incorrecto.');run.mode=raw.mode;}
    for(const key of ['gpsGaps','maxGpsGapMs','rejectedFixes'] as const)if(raw[key]!==undefined){if(!finite(raw[key])||raw[key]<0||!Number.isInteger(raw[key]))invalid('calidad GPS incorrecta.');run[key]=raw[key];}
    if(raw.lastAccuracy!==undefined){if(!finite(raw.lastAccuracy)||raw.lastAccuracy<0||raw.lastAccuracy>25)invalid('precisión GPS incorrecta.');run.lastAccuracy=raw.lastAccuracy;}
    if(raw.referenceId!==undefined){if(!validId(raw.referenceId))invalid('referencia incorrecta.');run.referenceId=raw.referenceId;}
    if(raw.referenceOffsetMs!==undefined){if(!finite(raw.referenceOffsetMs)||raw.referenceOffsetMs<0||raw.referenceOffsetMs>8640000000000000)invalid('inicio de referencia incorrecto.');run.referenceOffsetMs=raw.referenceOffsetMs;}
    if(raw.circuitStartedAt!==undefined){if(!validTime(raw.circuitStartedAt)||raw.circuitStartedAt<start)invalid('inicio de circuito incorrecto.');run.circuitStartedAt=raw.circuitStartedAt;}
    if(raw.checkpointKm!==undefined){if(raw.checkpointKm!==null&&!validCheckpointInterval(raw.checkpointKm))invalid('intervalo incorrecto.');run.checkpointKm=raw.checkpointKm as Run['checkpointKm'];}
    for(const key of ['autoFinish','autoCompleted','voiceEnabled','incomplete'] as const)if(raw[key]!==undefined){if(typeof raw[key]!=='boolean')invalid('llegada incorrecta.');run[key]=raw[key];}
    if(raw.comparison!==undefined){if(!validComparison(raw.comparison))invalid('parciales incorrectos.');run.comparison=raw.comparison;}
    if(raw.notice!==undefined){if(!validNotice(raw.notice))invalid('aviso incorrecto.');run.notice=raw.notice;}
    return run;
  });
  const routeIds = new Set(runs.map(r => r.routeId));
  const routeDetails: RouteDetails = Object.create(null);
  for (const [key, raw] of Object.entries(data.routeDetails)) {
    if (!routeIds.has(key)) continue;
    if (!object(raw) || typeof raw.favorite !== 'boolean' || typeof raw.note !== 'string' || raw.note.length > 1000) invalid('notas o favoritas incorrectas.');
    if(raw.checkpointKm!==undefined&&raw.checkpointKm!==null&&!validCheckpointInterval(raw.checkpointKm))invalid('intervalo de puntos de control incorrecto.');
    if(raw.voiceEnabled!==undefined&&typeof raw.voiceEnabled!=='boolean')invalid('preferencia de voz incorrecta.');
    if(raw.referenceChoice!==undefined&&!validReferenceChoice(raw.referenceChoice)||raw.autoFinish!==undefined&&typeof raw.autoFinish!=='boolean')invalid('preferencias incorrectas.');
    routeDetails[key] = { favorite: raw.favorite, note: raw.note, ...(raw.voiceEnabled===undefined?{}:{voiceEnabled:raw.voiceEnabled as boolean}), ...(raw.referenceChoice===undefined?{}:{referenceChoice:raw.referenceChoice as string}),...(raw.autoFinish===undefined?{}:{autoFinish:raw.autoFinish as boolean}), ...(raw.checkpointKm===undefined?{}:{checkpointKm:raw.checkpointKm as RouteDetails[string]['checkpointKm']}) };
  }
  return { format: 'ghovo-backup', version: 1, createdAt: data.createdAt, runs, routeDetails };
}
export function makeBackup(runs: Run[], routeDetails: RouteDetails, createdAt: number): Backup {
  // A round trip also checks that exports can be imported by this version.
  return parseBackup(JSON.stringify({ format: 'ghovo-backup', version: 1, createdAt, runs: runs.filter(r => r.endedAt !== undefined), routeDetails }));
}
export function mergeBackup(existing: Run[], details: RouteDetails, backup: Backup) {
  const existingById = new Map(existing.map(r => [r.id, r]));
  const ids = new Set(existingById.keys());
  const existingRoutes = new Set(existing.map(r => r.routeId));
  const routeMapping = new Map<string, string>();
  // An earlier import may already have renamed a colliding route ID. Keep future
  // attempts with that imported route, using its shared original attempt as anchor.
  for (const run of backup.runs) {
    const shared = existingById.get(run.id);
    if (shared && shared.startedAt === run.startedAt && !routeMapping.has(run.routeId)) routeMapping.set(run.routeId, shared.routeId);
  }
  let suffix = 0;
  const resolveRoute = (r: Run) => {
    if (routeMapping.has(r.routeId)) return routeMapping.get(r.routeId)!;
    // Shared original attempt means the same route; accidental route-ID clashes stay separate.
    let id = r.routeId;
    if (existingRoutes.has(id)) do { id = `import-${backup.createdAt}-${suffix++}`; } while (existingRoutes.has(id));
    existingRoutes.add(id); routeMapping.set(r.routeId, id); return id;
  };
  const additions = backup.runs.filter(r => !ids.has(r.id)).map(r => ({ ...r, routeId: resolveRoute(r) }));
  const mergedDetails: RouteDetails = { ...details };
  for (const [original, mapped] of routeMapping) if (!Object.hasOwn(mergedDetails, mapped) && backup.routeDetails[original]) mergedDetails[mapped] = { ...backup.routeDetails[original] };
  return { runs: [...existing, ...additions].sort((a, b) => a.startedAt - b.startedAt), routeDetails: mergedDetails, added: additions.length, skipped: backup.runs.length - additions.length };
}
export const escapeXml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
export function runToGpx(run: Run): string {
  if (run.endedAt === undefined || !run.points.length) throw Error('Solo se pueden exportar intentos terminados.');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="GHOVO" xmlns="http://www.topografix.com/GPX/1/1"><trk><name>${escapeXml(run.name)}</name>${traceSegments(run.points,true).map(segment=>`<trkseg>${segment.map(p => `<trkpt lat="${p.latitude}" lon="${p.longitude}"><time>${new Date(p.timestamp).toISOString()}</time></trkpt>`).join('')}</trkseg>`).join('')}</trk></gpx>`;
}
