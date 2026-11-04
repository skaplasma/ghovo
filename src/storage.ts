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
  'CREATE TABLE IF NOT EXISTS runs (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL, sig TEXT NOT NULL, json TEXT NOT NULL); '+
  // Posiciones del recorrido en curso, una fila por punto: anexar es barato y evita
  // reescribir el recorrido entero cada vez que llega una posición GPS.
  'CREATE TABLE IF NOT EXISTS active_points (idx INTEGER PRIMARY KEY, value TEXT NOT NULL)';
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
export async function write(key:string,value:unknown) {
  if(key==='history'){await writeMany({history:value});return;}
  if(key==='active'){await writeActive(value as Run|null);return;}
  if(!validStateValue(key,value))throw Error(`No se pueden guardar datos incompletos (${key}).`);
  await (await db()).runAsync(STATE_UPSERT,key,JSON.stringify(value));
  cache.delete(key);
}
// Escritura completa del recorrido: cabecera sin puntos y tabla de posiciones reemplazada.
async function writeActive(run:Run|null){
  if(run!==null&&!validStateValue('active',run))throw Error('No se pueden guardar datos incompletos (active).');
  const connection=await db();
  await connection.withExclusiveTransactionAsync(async transaction=>{
    await transaction.runAsync('DELETE FROM active_points');
    if(run)for(const [index,point] of (run.points??[]).entries())await transaction.runAsync('INSERT INTO active_points(idx,value) VALUES(?,?)',index,JSON.stringify(point));
    await transaction.runAsync(STATE_UPSERT,'active',JSON.stringify(run?{...run,points:[]}:null));
  });
  activeCache=undefined;
  cache.delete('active');
}
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
// El recorrido en curso se guarda en dos partes: la cabecera (sin puntos) en `state` y
// las posiciones en `active_points`, una fila por punto. La caché evita releer y volver
// a interpretar todo el recorrido en cada refresco: solo añade las filas nuevas.
let activeCache:{id:string;maxIdx:number;points:Run['points']}|undefined;
export async function active():Promise<Run|null>{
  const header=await read<Run|null>('active',null);
  if(!header)return null;
  // Una cabecera con puntos viene de una escritura completa antigua: se respeta tal cual.
  if(header.points?.length)return header;
  const connection=await db();
  if(!activeCache||activeCache.id!==header.id){
    const rows=await connection.getAllAsync<{idx:number;value:string}>('SELECT idx,value FROM active_points ORDER BY idx');
    const points:Run['points']=[];
    for(const row of rows){try{points.push(JSON.parse(row.value));}catch{/* punto ilegible: se ignora */}}
    activeCache={id:header.id,maxIdx:rows.at(-1)?.idx??-1,points};
    return {...header,points};
  }
  const fresh=await connection.getAllAsync<{idx:number;value:string}>('SELECT idx,value FROM active_points WHERE idx>? ORDER BY idx',activeCache.maxIdx);
  for(const row of fresh){
    try{activeCache.points.push(JSON.parse(row.value));activeCache.maxIdx=row.idx;}catch{/* punto ilegible: se ignora */}
  }
  return {...header,points:activeCache.points};
}

// Anexa solo las posiciones nuevas y actualiza la cabecera. Es el camino caliente: una
// inserta por punto en vez de reescribir el recorrido completo.
export async function saveActive(run:Run,added:Run['points']){
  const connection=await db();
  const header={...run,points:[] as Run['points']};
  let replaced=false;
  await connection.withExclusiveTransactionAsync(async transaction=>{
    const stored=await transaction.getFirstAsync<{value:string}>('SELECT value FROM state WHERE key=?','active');
    let storedRun:Run|null=null;
    try{storedRun=stored?JSON.parse(stored.value):null;}catch{storedRun=null;}
    // Se reemplaza la tabla si la cabecera guardada traía puntos (escritura completa),
    // si es otro recorrido, o si no hay cabecera. Solo se anexa en el camino normal.
    const replace=!storedRun||storedRun.id!==run.id||!!storedRun.points?.length;
    replaced=replace;
    if(replace){
      await transaction.runAsync('DELETE FROM active_points');
      for(const [index,point] of run.points.entries())await transaction.runAsync('INSERT INTO active_points(idx,value) VALUES(?,?)',index,JSON.stringify(point));
    }else if(added.length){
      const top=await transaction.getFirstAsync<{top:number|null}>('SELECT MAX(idx) AS top FROM active_points');
      let next=(top?.top??-1)+1;
      for(const point of added)await transaction.runAsync('INSERT INTO active_points(idx,value) VALUES(?,?)',next++,JSON.stringify(point));
    }
    await transaction.runAsync(STATE_UPSERT,'active',JSON.stringify(header));
  });
  cache.delete('active');
  // Si solo se anexaron filas, la caché sigue siendo válida y recogerá las nuevas en la
  // siguiente lectura; si la tabla se reemplazó, hay que descartarla.
  if(replaced)activeCache=undefined;
}

// Borra los datos locales del usuario que elimina su cuenta: rutas, ajustes, copias y
// cualquier resto en la base. No toca nada del servidor.
export async function wipeLocalData(){
  const connection=await db();
  await connection.withExclusiveTransactionAsync(async transaction=>{
    await transaction.runAsync('DELETE FROM state');
    await transaction.runAsync('DELETE FROM runs');
    await transaction.runAsync('DELETE FROM active_points');
  });
  cache.clear();
  runsCache.clear();
  historySnapshot=undefined;
}
