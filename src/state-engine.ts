export interface StateConnection {
  getFirstAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T | null>;
  runAsync(sql: string, ...params: (string | number | null)[]): Promise<unknown>;
  getAllAsync?<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]>;
}
export interface StateDatabase extends StateConnection {
  withExclusiveTransactionAsync(task: (connection: StateConnection) => Promise<void>): Promise<void>;
}
export const STATE_UPSERT = 'INSERT INTO state(key,value,revision) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET value=excluded.value,revision=state.revision+1';

// Firma barata para no comparar el JSON completo de cada ruta al guardar.
export function runSignature(json: string) {
  let hash = 5381;
  for (let index = 0; index < json.length; index += 1) hash = ((hash * 33) ^ json.charCodeAt(index)) >>> 0;
  return `${json.length}:${hash.toString(36)}`;
}

type StoredRun = {id: string};

// Solo escribe las rutas que cambiaron y borra las que ya no están: la biblioteca
// deja de reescribirse entera en cada guardado.
export async function syncRuns(transaction: StateConnection, runs: StoredRun[]) {
  if (!transaction.getAllAsync) throw Error('El almacén no permite sincronizar rutas.');
  const stored = await transaction.getAllAsync<{id: string; sig: string}>('SELECT id,sig FROM runs');
  const current = new Map(stored.map(row => [row.id, row.sig]));
  const incoming = new Set<string>();
  for (const run of runs) {
    const json = JSON.stringify(run);
    const sig = runSignature(json);
    incoming.add(run.id);
    if (current.get(run.id) === sig) continue;
    if (current.has(run.id)) await transaction.runAsync('UPDATE runs SET sig=?,json=? WHERE id=?', sig, json, run.id);
    else await transaction.runAsync('INSERT INTO runs(id,sig,json) VALUES(?,?,?)', run.id, sig, json);
  }
  for (const id of current.keys()) if (!incoming.has(id)) await transaction.runAsync('DELETE FROM runs WHERE id=?', id);
}

export type CommitHooks = {runs?: StoredRun[]; previousHistory?: unknown[]};

export async function commitState(database: StateDatabase, values: Record<string, unknown>, checkpoint: boolean, now: number, hooks?: CommitHooks) {
  await database.withExclusiveTransactionAsync(async transaction => {
    if (checkpoint) {
      const previous: Record<string, unknown> = { savedAt: now, history: hooks ? hooks.previousHistory ?? [] : [], routeDetails: {}, lastResult: null };
      for (const key of ['history', 'routeDetails', 'lastResult']) {
        // Con la biblioteca normalizada el historial llega calculado desde storage.
        if (key === 'history' && hooks) continue;
        const row = await transaction.getFirstAsync<{ value: string }>('SELECT value FROM state WHERE key=?', key);
        if (row) previous[key] = JSON.parse(row.value);
      }
      await transaction.runAsync(STATE_UPSERT, 'recovery', JSON.stringify(previous));
    }
    for (const [key, value] of Object.entries(values)) {
      const json = JSON.stringify(value);
      if (json === undefined) throw Error(`No se puede guardar el valor de ${key}.`);
      await transaction.runAsync(STATE_UPSERT, key, json);
    }
    if (hooks?.runs) await syncRuns(transaction, hooks.runs);
  });
}
