import { DatabaseSync } from 'node:sqlite';
import type { StateConnection } from '../src/state-engine';
import type { Run } from '../src/core';

let mockConnection: ReturnType<typeof connection>;
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn(async () => mockConnection) }));
function connection(native: DatabaseSync) {
  const adapter = {
    execAsync: async (sql: string) => { native.exec(sql); },
    getAllAsync: async (sql: string, ...args: (string | number | null)[]) => native.prepare(sql).all(...args),
    getFirstAsync: async <T,>(sql: string, ...args: (string | number | null)[]) => (native.prepare(sql).get(...args) ?? null) as T | null,
    runAsync: async (sql: string, ...args: (string | number | null)[]) => native.prepare(sql).run(...args),
    withExclusiveTransactionAsync: async (task: (transaction: StateConnection) => Promise<void>) => {
      native.exec('BEGIN IMMEDIATE');
      try { await task(adapter); native.exec('COMMIT'); }
      catch (error) { native.exec('ROLLBACK'); throw error; }
    },
  };
  return adapter;
}
let db: DatabaseSync;
let storage: typeof import('../src/storage');
const run: Run = { id: 'one', routeId: 'route', name: 'Paseo', startedAt: 1000, endedAt: 2000, points: [{ latitude: 40, longitude: -3, timestamp: 1000, accuracy: 5 }, { latitude: 40.001, longitude: -3, timestamp: 2000, accuracy: 5 }] };
beforeEach(() => {
  jest.resetModules(); db = new DatabaseSync(':memory:'); mockConnection = connection(db);
  storage = require('../src/storage');
});
afterEach(() => { db.close(); });

test('unchanged revisions reuse parsed history and writes invalidate the cache', async () => {
  await storage.write('history', [run]);
  const first = await storage.history(); expect(await storage.history()).toBe(first);
  await storage.write('history', [{ ...run, name: 'Renombrado' }]);
  const next = await storage.history(); expect(next).not.toBe(first); expect(next[0].name).toBe('Renombrado'); expect(first[0].name).toBe('Paseo');
});
test('existing APK database without revisions migrates without losing a route', async () => {
  db.exec('CREATE TABLE state(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  db.prepare('INSERT INTO state VALUES (?,?)').run('history', JSON.stringify([run]));
  expect(await storage.history()).toEqual([run]);
  expect(db.prepare('PRAGMA table_info(state)').all().some(column => column.name === 'revision')).toBe(true);
});
test('JSON and structural damage produce a recoverable error without deleting the stored bytes', async () => {
  await storage.write('history', [run]);
  for (const invalid of ['{broken', '{"not":"an array"}', '[null]']) {
    db.prepare('UPDATE runs SET json=?,sig=? WHERE id=?').run(invalid, `corrupt-${invalid.length}`, 'one');
    await expect(storage.history()).rejects.toThrow('No se han borrado');
    expect(db.prepare('SELECT json FROM runs WHERE id=?').get('one')!.json).toBe(invalid);
  }
});
test('a valid recovery snapshot restores a damaged library while retaining the snapshot', async () => {
  await storage.writeMany({ history: [run], routeDetails: { route: { favorite: true, note: 'Antes' } }, lastResult: 'one', active: null });
  await storage.writeMany({ history: [], routeDetails: {}, lastResult: null }, true);
  const saved = await storage.read('recovery', null);
  db.prepare('INSERT INTO runs(id,sig,json) VALUES(?,?,?)').run('broken', 'corrupt', '{broken');
  await expect(storage.history()).rejects.toThrow('No se han borrado');
  await storage.recoverPreviousLibrary();
  expect(await storage.history()).toEqual([run]);
  expect(await storage.read('routeDetails', {})).toEqual({ route: { favorite: true, note: 'Antes' } });
  expect(await storage.read('recovery', null)).toEqual(saved);
});
test('invalid replacement data cannot overwrite the valid library or its checkpoint', async () => {
  await storage.write('history', [run]);
  await expect(storage.writeMany({ history: [null] }, true)).rejects.toThrow('datos incompletos');
  expect(await storage.history()).toEqual([run]); expect(await storage.read('recovery', null)).toBeNull();
});
test('a failed operation does not poison the serialization queue', async () => {
  const first = storage.serial(async () => { throw Error('Fallo transitorio'); });
  const second = storage.serial(async () => 42);
  await expect(first).rejects.toThrow('Fallo transitorio'); await expect(second).resolves.toBe(42);
});
test('a failed first database open can be retried', async () => {
  const sqlite = require('expo-sqlite');
  sqlite.openDatabaseAsync.mockRejectedValueOnce(Error('Archivo temporalmente ocupado'));
  await expect(storage.history()).rejects.toThrow('temporalmente ocupado');
  await expect(storage.history()).resolves.toEqual([]); expect(sqlite.openDatabaseAsync).toHaveBeenCalledTimes(2);
});
test('el recorrido en curso se anexa por puntos y se lee completo', async () => {
  const draft: Run = {...run, endedAt: undefined};
  await storage.write('active', draft);
  const extra = {latitude: 40.002, longitude: -3, timestamp: 3000, accuracy: 5};
  await storage.saveActive({...draft, points: [...draft.points, extra]}, [extra]);
  const live = await storage.active();
  expect(live?.points).toHaveLength(3);
  expect(live?.points.at(-1)?.timestamp).toBe(3000);
  // La cabecera guardada no lleva las posiciones: solo la tabla.
  const header = JSON.parse(db.prepare('SELECT value FROM state WHERE key=?').get('active')!.value);
  expect(header.points).toEqual([]);
  expect(db.prepare('SELECT COUNT(*) AS total FROM active_points').get().total).toBe(3);
});
test('una escritura completa posterior reemplaza la tabla de posiciones', async () => {
  const draft: Run = {...run, endedAt: undefined};
  await storage.write('active', draft);
  await storage.write('active', {...draft, points: draft.points.slice(0, 1)});
  const live = await storage.active();
  expect(live?.points).toHaveLength(1);
  expect(db.prepare('SELECT COUNT(*) AS total FROM active_points').get().total).toBe(1);
});
test('la caché del recorrido recoge solo las posiciones nuevas sin duplicarlas', async () => {
  const draft: Run = {...run, endedAt: undefined};
  await storage.write('active', draft);
  expect((await storage.active())?.points).toHaveLength(2);
  const third = {latitude: 40.003, longitude: -3, timestamp: 4000, accuracy: 5};
  await storage.saveActive({...draft, points: [...draft.points, third]}, [third]);
  expect((await storage.active())?.points).toHaveLength(3);
  const fourth = {latitude: 40.004, longitude: -3, timestamp: 5000, accuracy: 5};
  await storage.saveActive({...draft, points: [...draft.points, third, fourth]}, [fourth]);
  const live = await storage.active();
  expect(live?.points).toHaveLength(4);
  expect(live?.points.map(point => point.timestamp)).toEqual([1000, 2000, 4000, 5000]);
});
