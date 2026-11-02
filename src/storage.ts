import * as SQLite from 'expo-sqlite';
import { Run } from './core';
import { commitState, runSignature, STATE_UPSERT } from './state-engine';
import { validStateValue } from './state-validation';
let database: ReturnType<typeof SQLite.openDatabaseAsync> | undefined;
const cache=new Map<string,{revision:number;value:unknown}>();
// Cada ruta vive en su propia fila: al guardar solo se reescribe la que cambia y al
// leer se reaprovecha el objeto ya interpretado mientras su firma siga igual.
const runsCache=new Map<string,{sig:string;run:Run}>();
// Misma lista de rutas y mismas firmas: se devuelve el mismo array para no repintar.
let historySnapshot:{keys:string;runs:Run[]}|undefined;
const HISTORY_ERROR='No se pudieron leer los datos locales (history). No se han borrado. Utiliza la copia de recuperación.';
const SCHEMA='PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; '+
  'CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0); '+
  'CREATE TABLE IF NOT EXISTS runs (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, sig TEXT NOT NULL, json TEXT NOT NULL)';
type Connection=Awaited<ReturnType<typeof SQLite.openDatabaseAsync>>;

// Copia la biblioteca antigua (una sola fila JSON) a la tabla runs y retira la fila.
async function migrateHistory(connection:Connection) {
  const legacy=await connection.getFirstAsync<{value:string}>('SELECT value FROM state WHERE key=?','history');
  if(!legacy)return;
  try {
    const runs=JSON.parse(legacy.value) as Run[];
    if(!Array.isArray(runs))return;
    await connection.withExclusiveTransactionAsync(async transaction=>{
      for(const run of runs){
        if(!run||typeof run.id!=='string')continue;
        const json=JSON.stringify(run);
        await transaction.runAsync('INSERT OR IGNORE INTO runs(id,sig,json) VALUES(?,?,?)',run.id,runSignature(json),json);
      }
      await transaction.runAsync('DELETE FROM state WHERE key=?','history');
    });
  } catch { /* Si la copia falla se conserva la fila antigua: no se pierde nada. */ }
}

async function db() {
  if (!database) database=(async()=>{
    const d=await SQLite.openDatabaseAsync('ghovo.db');
    await d.execAsync(SCHEMA);
    if(!(await d.getAllAsync<{name:string}>('PRAGMA table_info(state)')).some(column=>column.name==='revision')) {
      try {await d.execAsync('ALTER TABLE state ADD COLUMN revision INTEGER NOT NULL DEFAULT 0');}
      catch(error) {if(!(await d.getAllAsync<{name:string}>('PRAGMA table_info(state)')).some(column=>column.name==='revision'))throw error;}
    }
    await migrateHistory(d);
    return d;
  })().catch(error=>{database=undefined;throw error;});
  return database;
}
let queue: Promise<unknown> = Promise.resolve();
export function serial<T>(fn:()=>Promise<T>):Promise<T> {const next=queue.then(fn);queue=next.catch(()=>{});return next;}

async function readStoredRuns(connection:Connection):Promise<Run[]> {
  const rows=await connection.getAllAsync<{json:string}>('SELECT json FROM runs ORDER BY seq');
  return rows.map(row=>JSON.parse(row.json) as Run);
}

export async function read<T>(key:string, fallback:T):Promise<T> {
  if(key==='history')return await history() as unknown as T;
  const connection=await db();
  const revision=await connection.getFirstAsync<{revision:number}>('SELECT revision FROM state WHERE key=?',key);
  const cached=cache.get(key);
  if(revision&&cached?.revision===revision.revision)return cached.value as T;
  const row=await connection.getFirstAsync<{value:string;revision:number}>('SELECT value,revision FROM state WHERE key=?',key);
  if(!row) return fallback;
  try { const value=JSON.parse(row.value);if(!validStateValue(key,value))throw Error('Estructura incorrecta');cache.set(key,{revision:row.revision,value});return value; } catch { throw Error(`No se pudieron leer los datos locales (${key}). No se han borrado. Utiliza la copia de recuperación.`); }
}
export async function write(key:string,value:unknown) {if(key==='history'){await writeMany({history:value});return;}if(!validStateValue(key,value))throw Error(`No se pueden guardar datos incompletos (${key}).`);await (await db()).runAsync(STATE_UPSERT,key,JSON.stringify(value));cache.delete(key);}
export type RecoverySnapshot = { savedAt: number; history: Run[]; routeDetails: Record<string, { favorite: boolean; note: string }>; lastResult: string | null };
// Call within serial() when updating related records. SQLite commits every key or none.
export async function writeMany(values: Record<string, unknown>, checkpoint = false) {
  const {history: nextRuns,...rest}=values as {history?:Run[]}&Record<string,unknown>;
  for(const [key,value] of Object.entries(rest))if(!validStateValue(key,value))throw Error(`No se pueden guardar datos incompletos (${key}).`);
  if(nextRuns!==undefined&&!validStateValue('history',nextRuns))throw Error('No se pueden guardar datos incompletos (history).');
  const connection=await db();
  const previousHistory=checkpoint?await readStoredRuns(connection):undefined;
  const hooks=(nextRuns!==undefined||checkpoint)?{runs:nextRuns,previousHistory}:undefined;
  await commitState(connection,rest,checkpoint,Date.now(),hooks);
  for(const key of Object.keys(rest))cache.delete(key);
  if(checkpoint)cache.delete('recovery');
}
export async function recoverPreviousLibrary() {
  return serial(async()=>{
    if(await active()) throw Error('Finaliza o descarta la grabación antes de recuperar datos.');
    const snapshot=await read<RecoverySnapshot|null>('recovery',null);
    if(!snapshot) throw Error('Todavía no hay una copia de recuperación disponible.');
    // Retain the snapshot so a corrupt current library cannot prevent recovery.
    await writeMany({history:snapshot.history,routeDetails:snapshot.routeDetails,lastResult:snapshot.lastResult});
  });
}
export async function history():Promise<Run[]> {
  const connection=await db();
  let rows=await connection.getAllAsync<{id:string;sig:string;json:string}>('SELECT id,sig,json FROM runs ORDER BY seq');
  // Red de seguridad: si la biblioteca está vacía pero aún existe la fila antigua
  // (una migración que falló), se reintenta antes de decir que no hay rutas.
  if(!rows.length&&await connection.getFirstAsync('SELECT 1 FROM state WHERE key=?','history')){
    await migrateHistory(connection);
    rows=await connection.getAllAsync<{id:string;sig:string;json:string}>('SELECT id,sig,json FROM runs ORDER BY seq');
  }
  const keys=rows.map(row=>`${row.id}:${row.sig}`).join('|');
  if(historySnapshot&&historySnapshot.keys===keys)return historySnapshot.runs;
  const runs:Run[]=[];
  for(const row of rows){
    const cached=runsCache.get(row.id);
    if(cached&&cached.sig===row.sig){runs.push(cached.run);continue;}
    let run:Run;
    try { run=JSON.parse(row.json) as Run; } catch { throw Error(HISTORY_ERROR); }
    runsCache.set(row.id,{sig:row.sig,run});
    runs.push(run);
  }
  if(!validStateValue('history',runs))throw Error(HISTORY_ERROR);
  historySnapshot={keys,runs};
  return runs;
}
export const active = () => read<Run|null>('active',null);
