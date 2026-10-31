import * as SQLite from 'expo-sqlite';
import { Run } from './core';
import { commitState, STATE_UPSERT } from './state-engine';
import { validStateValue } from './state-validation';
let database: ReturnType<typeof SQLite.openDatabaseAsync> | undefined;
const cache=new Map<string,{revision:number;value:unknown}>();
async function db() {
  if (!database) database=(async()=>{
    const d=await SQLite.openDatabaseAsync('ghovo.db');
    await d.execAsync('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS state (key TEXT PRIMARY KEY, value TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)');
    if(!(await d.getAllAsync<{name:string}>('PRAGMA table_info(state)')).some(column=>column.name==='revision')) {
      try {await d.execAsync('ALTER TABLE state ADD COLUMN revision INTEGER NOT NULL DEFAULT 0');}
      catch(error) {if(!(await d.getAllAsync<{name:string}>('PRAGMA table_info(state)')).some(column=>column.name==='revision'))throw error;}
    }
    return d;
  })().catch(error=>{database=undefined;throw error;});
  return database;
}
let queue: Promise<unknown> = Promise.resolve();
export function serial<T>(fn:()=>Promise<T>):Promise<T> {const next=queue.then(fn);queue=next.catch(()=>{});return next;}
export async function read<T>(key:string, fallback:T):Promise<T> {
  const connection=await db();
  const revision=await connection.getFirstAsync<{revision:number}>('SELECT revision FROM state WHERE key=?',key);
  const cached=cache.get(key);
  if(revision&&cached?.revision===revision.revision)return cached.value as T;
  const row=await connection.getFirstAsync<{value:string;revision:number}>('SELECT value,revision FROM state WHERE key=?',key);
  if(!row) return fallback;
  try { const value=JSON.parse(row.value);if(!validStateValue(key,value))throw Error('Estructura incorrecta');cache.set(key,{revision:row.revision,value});return value; } catch { throw Error(`No se pudieron leer los datos locales (${key}). No se han borrado. Utiliza la copia de recuperación.`); }
}
export async function write(key:string,value:unknown) {if(!validStateValue(key,value))throw Error(`No se pueden guardar datos incompletos (${key}).`);await (await db()).runAsync(STATE_UPSERT,key,JSON.stringify(value));cache.delete(key);}
export type RecoverySnapshot = { savedAt: number; history: Run[]; routeDetails: Record<string, { favorite: boolean; note: string }>; lastResult: string | null };
// Call within serial() when updating related records. SQLite commits every key or none.
export async function writeMany(values: Record<string, unknown>, checkpoint = false) {
  for(const [key,value] of Object.entries(values))if(!validStateValue(key,value))throw Error(`No se pueden guardar datos incompletos (${key}).`);
  await commitState(await db(),values,checkpoint,Date.now());
  for(const key of Object.keys(values))cache.delete(key);
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
export const active = () => read<Run|null>('active',null);
export const history = () => read<Run[]>('history',[]);
