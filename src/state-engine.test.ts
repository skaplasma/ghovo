import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { commitState, STATE_UPSERT, type StateConnection } from './state-engine.ts';
function fixture() {
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE state(key TEXT PRIMARY KEY,value TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0)');
  const connection:StateConnection={
    getFirstAsync:async<T>(sql:string,...args:(string|number|null)[])=> (db.prepare(sql).get(...args)??null) as T|null,
    runAsync:async(sql,...args)=>db.prepare(sql).run(...args),
  };
  const store={...connection,withExclusiveTransactionAsync:async(task:(c:StateConnection)=>Promise<void>)=>{db.exec('BEGIN IMMEDIATE');try{await task(connection);db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}}};
  const read=(key:string)=>{const row=db.prepare('SELECT value FROM state WHERE key=?').get(key);return row?JSON.parse(row.value as string):null;};
  return {db,store,read};
}
test('one commit saves every key and checkpoints the previous library',async()=>{
  const f=fixture();
  try {
    await commitState(f.store,{history:['old'],routeDetails:{r:{note:'old'}},active:{id:'run'}},false,1);
    await commitState(f.store,{history:['old','new'],active:null,lastResult:'new'},true,2);
    assert.deepEqual(f.read('history'),['old','new']);assert.equal(f.read('active'),null);assert.equal(f.read('lastResult'),'new');
    assert.deepEqual(f.read('recovery').history,['old']);assert.equal(f.read('recovery').savedAt,2);
  }finally{f.db.close();}
});
test('failure after writing history rolls back both history and recovery snapshot',async()=>{
  const f=fixture();
  try {
    await commitState(f.store,{history:['old'],active:{id:'run'}},false,1);
    await assert.rejects(()=>commitState(f.store,{history:['new'],invalid:undefined,active:null},true,2));
    assert.deepEqual(f.read('history'),['old']);assert.deepEqual(f.read('active'),{id:'run'});assert.equal(f.read('recovery'),null);
  }finally{f.db.close();}
});
test('revision increases on each update and old schema can be migrated without losing values',async()=>{
  const f=fixture();
  try {
    f.db.exec('DROP TABLE state;CREATE TABLE state(key TEXT PRIMARY KEY,value TEXT NOT NULL);INSERT INTO state VALUES (\'history\',\'["saved"]\');ALTER TABLE state ADD COLUMN revision INTEGER NOT NULL DEFAULT 0');
    assert.deepEqual(f.read('history'),['saved']);
    await f.store.runAsync(STATE_UPSERT,'history','["first"]');await f.store.runAsync(STATE_UPSERT,'history','["second"]');
    assert.equal(f.db.prepare('SELECT revision FROM state WHERE key=?').get('history')!.revision,2);
  }finally{f.db.close();}
});
