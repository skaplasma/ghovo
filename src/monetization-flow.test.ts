import {test} from 'node:test';
import assert from 'node:assert/strict';
import {creditFlow,adViewingAllowed,type BillingJournal,type BillingPorts} from './monetization-flow.ts';
function fixture(){
  let journal:BillingJournal|null=null,exists=false,running=false;
  const events:string[]=[];
  const ports:BillingPorts={userId:()=> 'account-a',read:async()=>journal,save:async value=>{journal=value;},requestId:()=> 'unique-request',reserve:async request=>{events.push(`reserve:${request}`);return {id:'server-ticket',state:'reserved'};},confirm:async()=>{events.push('confirm');},cancel:async()=>{events.push('cancel');},finish:async()=>{events.push('finish');},nativeStart:async()=>{events.push('native');exists=true;running=true;},nativeExists:async()=>exists,nativeRunning:async()=>running};
  return {ports,events,get journal(){return journal;},set journal(value:BillingJournal|null){journal=value;},setNative:(value:boolean,service=value)=>{exists=value;running=service;},flow:creditFlow(ports)};
}
test('a native start occurs before debit; finishing preserves the same server ticket',async()=>{
 const f=fixture();await f.flow.start('local-run');assert.deepEqual(f.events,['reserve:unique-request','native','confirm']);assert.equal(f.journal?.stage,'confirmed');await assert.rejects(f.flow.start('other-run'),/RECOVERY_REQUIRED/);await f.flow.complete('local-run');assert.equal(f.journal,null);assert.deepEqual(f.events.slice(-2),['confirm','finish']);
});
test('GPS failure before native start cancels reservation without debit',async()=>{
 const f=fixture();f.ports.nativeStart=async()=>{throw Error('GPS unavailable');};await assert.rejects(f.flow.start('run'),/GPS unavailable/);assert.deepEqual(f.events,['reserve:unique-request','cancel']);assert.equal(f.journal,null);
});
test('a definite zero-credit response does not leave a stuck journal',async()=>{
 const f=fixture();f.ports.reserve=async()=>{throw Error('NO_CREDITS');};await assert.rejects(f.flow.start('run'),/NO_CREDITS/);assert.equal(f.journal,null);assert.deepEqual(f.events,[]);
});
test('an unknown reservation response is recovered using the original request ID',async()=>{
 const f=fixture();const reserve=f.ports.reserve;f.ports.reserve=async()=>{throw Error('network');};await assert.rejects(f.flow.start('run'),/network/);assert.equal(f.journal?.requestId,'unique-request');f.ports.reserve=reserve;await f.flow.recover();assert.equal(f.journal,null);assert.deepEqual(f.events,['reserve:unique-request','cancel']);
});
test('lost debit response does not interrupt native GPS and recovery never requests another credit',async()=>{
 const f=fixture();const confirm=f.ports.confirm;f.ports.confirm=async()=>{throw Error('offline');};assert.deepEqual(await f.flow.start('run'),{pending:true});assert.equal(f.journal?.stage,'started');f.ports.confirm=confirm;await f.flow.recover();assert.equal(f.journal?.stage,'confirmed');assert.equal(f.events.filter(x=>x.startsWith('reserve')).length,1);
});
test('a saved draft after a crash is not proof the native service started',async()=>{
 const f=fixture();f.journal={userId:'account-a',runId:'draft',requestId:'original',sessionId:'ticket',stage:'reserved'};f.setNative(true,false);assert.deepEqual(await f.flow.recover(),{pending:true});assert.deepEqual(f.events,[]);f.setNative(true,true);await f.flow.recover();assert.deepEqual(f.events,['confirm']);
});
test('settlement can recover offline completion without charging for a second route',async()=>{
 const f=fixture();await f.flow.start('run');f.ports.finish=async()=>{throw Error('offline');};await f.flow.complete('run');assert.equal(f.journal?.stage,'finished');f.ports.finish=async()=>{f.events.push('finish');};f.setNative(false);await f.flow.recover();assert.equal(f.journal,null);assert.equal(f.events.filter(x=>x.startsWith('reserve')).length,1);
});
test('a different account cannot recover or settle another account route',async()=>{
 const f=fixture();await f.flow.start('run');f.ports.userId=()=> 'account-b';await assert.rejects(f.flow.recover(),/ACCOUNT_MISMATCH/);await assert.rejects(f.flow.complete('run'),/ACCOUNT_MISMATCH/);
});
test('advertising safety requires stationary foreground viewing, consent and no active route',()=>{
 const safe={active:false,foreground:true,stationary:true,consent:true,credits:3,premium:false};assert.equal(adViewingAllowed(safe),true);for(const patch of [{active:true},{foreground:false},{stationary:false},{consent:false},{credits:50},{premium:true}])assert.equal(adViewingAllowed({...safe,...patch}),false);
});
