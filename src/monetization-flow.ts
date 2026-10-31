export type BillingJournal={userId:string;runId:string;requestId:string;sessionId?:string;stage:'authorizing'|'reserved'|'started'|'confirmed'|'finished'};
export type BillingPorts={
  userId:()=>string;
  read:()=>Promise<BillingJournal|null>;save:(value:BillingJournal|null)=>Promise<void>;
  reserve:(requestId:string)=>Promise<{id:string;state:string}>;
  confirm:(sessionId:string)=>Promise<unknown>;cancel:(sessionId:string)=>Promise<unknown>;finish:(sessionId:string)=>Promise<unknown>;
  nativeStart:()=>Promise<void>;nativeExists:()=>Promise<boolean>;nativeRunning:()=>Promise<boolean>;requestId:()=>string;
};
export function creditFlow(ports:BillingPorts){
  const owned=(journal:BillingJournal)=>{if(journal.userId!==ports.userId())throw Error('BILLING_ACCOUNT_MISMATCH');};
  async function confirm(journal:BillingJournal){
    if(!journal.sessionId)throw Error('BILLING_SESSION_MISSING');
    await ports.confirm(journal.sessionId);
    await ports.save({...journal,stage:'confirmed'});
  }
  return {
    async start(runId:string){
      if(await ports.read())throw Error('BILLING_RECOVERY_REQUIRED');
      let journal:BillingJournal={userId:ports.userId(),runId,requestId:ports.requestId(),stage:'authorizing'};
      await ports.save(journal);
      // Persist requestId first: a lost HTTP response can be retried idempotently.
      let ticket:{id:string;state:string};
      try{ticket=await ports.reserve(journal.requestId);}catch(error){
        if(error instanceof Error&&['NO_CREDITS','ROUTE_ALREADY_ACTIVE','INVALID_RUN_ID','SIGN_IN_REQUIRED','AUTH_REQUIRED'].includes(error.message))await ports.save(null);
        throw error;
      }
      if(ticket.state!=='reserved')throw Error('BILLING_RECOVERY_REQUIRED');
      journal={...journal,sessionId:ticket.id,stage:'reserved'};await ports.save(journal);
      try{await ports.nativeStart();}catch(error){
        if(!await ports.nativeExists()){
          try{await ports.cancel(ticket.id);await ports.save(null);}catch{/* Keep the reservation journal for recovery; never spend again. */}
        }
        throw error;
      }
      journal={...journal,stage:'started'};
      // If the network or journal fails here, the native route keeps running.
      try{await ports.save(journal);await confirm(journal);return {pending:false};}catch{return {pending:true};}
    },
    async recover(){
      let journal=await ports.read();if(!journal)return {pending:false};owned(journal);
      if(!journal.sessionId){const ticket=await ports.reserve(journal.requestId);journal={...journal,sessionId:ticket.id,stage:ticket.state==='started'||ticket.state==='finished'?'confirmed':'reserved'};await ports.save(journal);}
      if(journal.stage==='finished'){await ports.confirm(journal.sessionId!);await ports.finish(journal.sessionId!);await ports.save(null);return {pending:false};}
      if(await ports.nativeExists()){
        // A saved draft is not proof of a successful native service start.
        if(!await ports.nativeRunning()&&(journal.stage==='reserved'||journal.stage==='authorizing'))return {pending:true};
        try{await confirm(journal);return {pending:false};}catch{return {pending:true};}
      }
      if(journal.stage==='authorizing'||journal.stage==='reserved'){
        await ports.cancel(journal.sessionId!);await ports.save(null);return {pending:false};
      }
      // A paid route does not generate a second charge. Reconcile its completion.
      await ports.confirm(journal.sessionId!);await ports.finish(journal.sessionId!);await ports.save(null);return {pending:false};
    },
    async complete(runId:string){
      const journal=await ports.read();if(!journal||journal.runId!==runId)return;owned(journal);
      // This method is called only after a native route has actually started.
      if(journal.stage==='authorizing'||journal.stage==='reserved')throw Error('BILLING_START_NOT_CONFIRMED');
      await ports.save({...journal,stage:'finished'});
      try{await ports.confirm(journal.sessionId!);await ports.finish(journal.sessionId!);await ports.save(null);}catch{/* Deferred settlement is retried from Credits; no new credit is requested. */}
    }
  };
}
export function adViewingAllowed({active,foreground,stationary,consent,credits,premium}:{active:boolean;foreground:boolean;stationary:boolean;consent:boolean;credits:number;premium:boolean}){
  return !active&&foreground&&stationary&&consent&&!premium&&credits>=0&&credits<50;
}
