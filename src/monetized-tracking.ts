import {active,read,write,serial} from './storage';
import {startTracking,trackingRunning} from './tracking';
import type {Point,Run} from './core';
import {creditFlow,type BillingJournal} from './monetization-flow';
import {billingRequest,billingUser,monetizationEnforced} from './monetization-api';
const journalKey='billingJournal';
let billingQueue:Promise<unknown>=Promise.resolve();
function exclusive<T>(operation:()=>Promise<T>):Promise<T>{const next=billingQueue.then(operation,operation);billingQueue=next.catch(()=>{});return next;}
const flow=(nativeStart:()=>Promise<void>)=>creditFlow({
  userId:()=>{const user=billingUser();if(!user)throw Error('SIGN_IN_REQUIRED');return user;},
  read:()=>serial(()=>read<BillingJournal|null>(journalKey,null)),save:value=>serial(()=>write(journalKey,value)),
  requestId:()=>`${Date.now()}:${Math.random().toString(36).slice(2,14)}`,
  reserve:requestId=>billingRequest<{id:string;state:string}>('/v1/routes/reserve',{runId:requestId}),
  confirm:id=>billingRequest(`/v1/routes/${id}/confirm`,{}),cancel:id=>billingRequest(`/v1/routes/${id}/cancel`,{}),finish:id=>billingRequest(`/v1/routes/${id}/finish`,{}),
  nativeStart,nativeRunning:trackingRunning,nativeExists:async()=>{const journal=await read<BillingJournal|null>(journalKey,null);return !!journal&&(await active())?.id===journal.runId;}
});
export async function startMonetizedTracking(run:Run,origin?:Point,prepared?:Point){
  if(!monetizationEnforced){if(prepared)await startTracking(run,origin,prepared);else await startTracking(run,origin);return;}
  const status=await billingRequest<{configured:boolean;enforcementEnabled:boolean}>('/v1/status',undefined,true);
  if(!status.configured||!status.enforcementEnabled)throw Error('BACKEND_NOT_CONFIGURED');
  await exclusive(()=>flow(()=>startTracking(run,origin,prepared)).start(run.id));
}
export async function settleMonetizedTracking(runId:string){if(!monetizationEnforced)return;await exclusive(()=>flow(async()=>{}).complete(runId));}
export async function recoverBilling(){if(!monetizationEnforced)return;await exclusive(()=>flow(async()=>{}).recover());}
export const pendingBilling=()=>read<BillingJournal|null>(journalKey,null);
