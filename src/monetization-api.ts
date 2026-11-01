import {accountClient,accountAccessToken,accountConfigured,accountSnapshot,loginAccount,logoutAccount} from './account-client';
export type WalletSnapshot={userId:string;credits:number;available:number;reserved:number;premium:boolean;revision:string;adsRemaining:number;resetAt:string;activeSession:{id:string;run_id:string;state:string}|null;config:{initialCredits:number;dailyAdLimit:number;maxCredits:number;priceMinor:number;currency:string;adsEnabled:boolean;enforcementEnabled:boolean;version:number}};
const backendUrl=(process.env.EXPO_PUBLIC_MONETIZATION_URL??'').replace(/\/$/,'');
export const monetizationConfigured=accountConfigured&&(!backendUrl||backendUrl.startsWith('https://'));
export const monetizationEnforced=monetizationConfigured&&process.env.EXPO_PUBLIC_MONETIZATION_ENABLED==='true';
function rpcError(error:{code?:string;message:string}){
 if(['PGRST202','42883','42501'].includes(error.code??''))return Error('CREDITS_NOT_READY');
 const codes=['AUTH_REQUIRED','VERIFIED_ACCOUNT_REQUIRED','SESSION_REVOKED','NO_CREDITS','ROUTE_ALREADY_ACTIVE','INVALID_RUN_ID','SESSION_NOT_FOUND','ROUTE_CANCELLED','CANNOT_CANCEL_STARTED_ROUTE','ROUTE_NOT_STARTED','DAILY_AD_LIMIT','WALLET_FULL','PREMIUM_HAS_NO_ADS'];
 return Error(codes.find(code=>error.message===code)??'SERVER_ERROR');
}
export async function billingRequest<T>(path:string,body?:unknown,publicRequest=false):Promise<T>{
 if(!monetizationConfigured)throw Error('BACKEND_NOT_CONFIGURED');
 if(backendUrl){
  const token=publicRequest?'':await accountAccessToken(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{const response=await fetch(backendUrl+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(!publicRequest?{Authorization:`Bearer ${token}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:controller.signal});const result=await response.json();if(!response.ok)throw Error(typeof result.error==='string'?result.error:'SERVER_ERROR');return result as T;}finally{clearTimeout(timer);}
 }
 await accountAccessToken();
 const api=accountClient(),payload=body&&typeof body==='object'?body as Record<string,unknown>:{};
 let name:string,args:Record<string,unknown>={};
 if(path==='/v1/account'||path==='/v1/status')name='ghovo_account';
 else if(path.startsWith('/v1/transactions')){name='ghovo_transactions';const before=new URL(path,'https://local.invalid').searchParams.get('before');if(before&&!/^\d{1,18}$/.test(before))throw Error('INVALID_CURSOR');args={p_before:before};}
 else if(path==='/v1/routes/reserve'){name='ghovo_route';args={p_action:'reserve',p_run_id:payload.runId};}
 else if(path==='/v1/ads/reward'){name='ghovo_claim_reward';args={p_reward_id:payload.rewardId};}
 else{const match=/^\/v1\/routes\/([a-f0-9-]{36})\/(confirm|cancel|finish)$/.exec(path);if(match){name='ghovo_route';args={p_action:match[2],p_session:match[1]};}else if(path.startsWith('/v1/ads/'))throw Error('ADS_NOT_CONFIGURED');else if(path.startsWith('/v1/premium/'))throw Error('PURCHASES_NOT_CONFIGURED');else throw Error('NOT_FOUND');}
 const {data,error}=await api.rpc(name,args);if(error)throw rpcError(error);
 if(path==='/v1/status'){const wallet=data as WalletSnapshot;return {configured:true,enforcementEnabled:wallet.config.enforcementEnabled} as T;}
 return data as T;
}
export async function claimAdReward(rewardId?:string){return billingRequest<{success:boolean;credits?:number}>('/v1/ads/reward',{rewardId});}
export async function signInBilling(email:string,password:string){await loginAccount(email,password);return billingRequest<WalletSnapshot>('/v1/account');}
export const billingUser=()=>accountSnapshot().user?.id??'';
export const billingSignedIn=()=>!!accountSnapshot().user;
export const signOutBilling=logoutAccount;
export const billingError=(error:unknown)=>{
 const code=error instanceof Error?error.message:String(error);
 const messages:Record<string,string>={BACKEND_NOT_CONFIGURED:'El servicio de créditos todavía no está conectado.',CREDITS_NOT_READY:'Tu cuenta está conectada. El acceso a los créditos está pendiente de activar en el servidor.',SIGN_IN_REQUIRED:'Inicia sesión con tu cuenta de GHOVO.',AUTH_REQUIRED:'Inicia sesión de nuevo.',SESSION_REVOKED:'La sesión ha caducado. Inicia sesión de nuevo.',VERIFIED_ACCOUNT_REQUIRED:'Confirma tu cuenta e inicia sesión de nuevo.',NO_CREDITS:'No tienes créditos disponibles.',BILLING_RECOVERY_REQUIRED:'Hay un inicio pendiente. Revisa su estado en tu cuenta antes de crear otro.',BILLING_ACCOUNT_MISMATCH:'Inicia sesión con la cuenta que autorizó este recorrido.',PURCHASES_NOT_CONFIGURED:'Las compras todavía no están configuradas.',ADS_NOT_CONFIGURED:'La publicidad todavía no está disponible.',AUTH_NOT_CONFIGURED:'Las cuentas todavía no están conectadas.',ROUTE_ALREADY_ACTIVE:'Hay un recorrido pendiente en tu cuenta. Revisa su estado.',DAILY_AD_LIMIT:'Has alcanzado el límite diario de recompensas.',WALLET_FULL:'Tu monedero ya tiene el límite máximo de créditos (50).',PREMIUM_HAS_NO_ADS:'Tu cuenta ya tiene Premium activo.'};
 return messages[code]??'No se pudo verificar la operación. Tu saldo no se ha modificado desde el teléfono. Reintenta cuando tengas conexión.';
};
