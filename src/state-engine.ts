export interface StateConnection {
  getFirstAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T | null>;
  runAsync(sql: string, ...params: (string | number | null)[]): Promise<unknown>;
}
export interface StateDatabase extends StateConnection {
  withExclusiveTransactionAsync(task: (connection: StateConnection) => Promise<void>): Promise<void>;
}
export const STATE_UPSERT = 'INSERT INTO state(key,value,revision) VALUES (?,?,1) ON CONFLICT(key) DO UPDATE SET value=excluded.value,revision=state.revision+1';
export async function commitState(database: StateDatabase, values: Record<string, unknown>, checkpoint: boolean, now: number) {
  await database.withExclusiveTransactionAsync(async transaction => {
    if (checkpoint) {
      const previous: Record<string, unknown> = { savedAt: now, history: [], routeDetails: {}, lastResult: null };
      for (const key of ['history', 'routeDetails', 'lastResult']) {
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
  });
}
