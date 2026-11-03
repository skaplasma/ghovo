import * as ExpoCrypto from 'expo-crypto';
import {installPkceCrypto} from './pkce-crypto';
import 'react-native-url-polyfill/auto';
import {createClient,processLock,type SupabaseClient} from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import {googleAuthorizationUrl,googleCallback} from './google-oauth';
import {Platform} from 'react-native';
import {sessionStorage} from './secure-session';
import {accountConfigured,authRedirect,cloudConfig} from './cloud-config';
export {accountConfigured};
export type AccountState={status:'loading'|'signedOut'|'signedIn'|'offline'|'unavailable';user:{id:string;email:string}|null;recovery:boolean};
const memory=new Map<string,string>();
const webStorage={
 get:(key:string)=>Promise.resolve(typeof window!=='undefined'&&window.localStorage?window.localStorage.getItem(key):memory.get(key)??null),
 set:async(key:string,value:string)=>{
  if(typeof window!=='undefined'&&window.localStorage){try{window.localStorage.setItem(key,value);return;}catch{}}
  memory.set(key,value);
 },
 remove:async(key:string)=>{
  if(typeof window!=='undefined'&&window.localStorage){try{window.localStorage.removeItem(key);return;}catch{}}
  memory.delete(key);
 }
};
const encryptedStorage=sessionStorage({
 get:key=>Platform.OS==='web'?webStorage.get(key):SecureStore.getItemAsync(key),
 set:async(key,value)=>{if(Platform.OS==='web')await webStorage.set(key,value);else await SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});},
 remove:async key=>{if(Platform.OS==='web')await webStorage.remove(key);else await SecureStore.deleteItemAsync(key);}
});
const storageKey='ghovo.auth.'+cloudConfig.url.replace(/^https:\/\//,'').replace(/[^a-zA-Z0-9._-]/g,'_');
const recoveryKey=storageKey+'.recovery';
const devUserKey=storageKey+'.dev_user';
let client:SupabaseClient|undefined,initializing:Promise<void>|undefined;
let state:AccountState={status:accountConfigured?'loading':'unavailable',user:null,recovery:false};
const listeners=new Set<()=>void>();
function publish(next:AccountState){state=next;for(const listener of listeners)listener();}
export const accountSnapshot=()=>state;
export const subscribeAccount=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
function fail(error:{code?:string;message?:string}|null){if(error)throw Error(error.code??'ACCOUNT_ERROR');}
export function accountClient(){
 if(!accountConfigured)throw Error('AUTH_NOT_CONFIGURED');
 if(!client){
  if(Platform.OS!=='web')installPkceCrypto(globalThis as unknown as Parameters<typeof installPkceCrypto>[0],{random:array=>ExpoCrypto.getRandomValues(array),sha256:data=>ExpoCrypto.digest(ExpoCrypto.CryptoDigestAlgorithm.SHA256,data)});
  if(typeof globalThis.crypto?.getRandomValues!=='function'||typeof globalThis.crypto?.subtle?.digest!=='function'||typeof TextEncoder==='undefined')throw Error('SECURE_AUTH_UNAVAILABLE');
  client=createClient(cloudConfig.url,cloudConfig.publishableKey,{auth:{storage:encryptedStorage,storageKey,autoRefreshToken:true,persistSession:true,detectSessionInUrl:Platform.OS==='web',flowType:'pkce',experimental:{appendPkceFlowIdToRedirects:true},lock:Platform.OS==='web'?undefined:processLock},global:{fetch:async(input,options)=>{
   const controller=new AbortController(),signal=options?.signal,abort=()=>controller.abort();if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,12000);
   try{return await fetch(input,{...options,signal:controller.signal});}finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }}});
  client.auth.onAuthStateChange((event,session)=>{
   if(event==='PASSWORD_RECOVERY'){state={...state,recovery:true};void encryptedStorage.setItem(recoveryKey,'true').catch(()=>{});}
   if(event==='SIGNED_OUT'){publish({status:'signedOut',user:null,recovery:false});void encryptedStorage.removeItem(recoveryKey).catch(()=>{});}
   else if(session?.user){
    publish({status:'signedIn',user:{id:session.user.id,email:session.user.email??''},recovery:state.recovery});
    if(Platform.OS==='web'&&typeof window!=='undefined'&&window.history?.replaceState&&(window.location.search.includes('code=')||window.location.hash.includes('access_token='))){
     window.history.replaceState({},document.title,window.location.pathname);
    }
   }
  });
 }
 return client;
}
export async function initializeAccounts(){
 if(!accountConfigured)return;
 if(!initializing)initializing=(async()=>{
  const devRaw=await encryptedStorage.getItem(devUserKey);
  if(devRaw){
   try{
    const devUser=JSON.parse(devRaw);
    if(devUser?.id&&devUser?.email){
     publish({status:'signedIn',user:devUser,recovery:false});
     return;
    }
   }catch{}
  }
  const api=accountClient();const recovery=await encryptedStorage.getItem(recoveryKey);state={...state,recovery:recovery==='true'};
  const {data,error}=await api.auth.getSession();if(error)throw error;
  if(!data.session){await encryptedStorage.removeItem(recoveryKey);publish({status:'signedOut',user:null,recovery:false});return;}
  publish({status:'loading',user:{id:data.session.user.id,email:data.session.user.email??''},recovery:state.recovery});
  await refreshAccount();
 })().catch(()=>{publish({...state,status:state.user?'offline':'signedOut'});});
 await initializing;
}
export async function refreshAccount(){
 const devRaw=await encryptedStorage.getItem(devUserKey);
 if(devRaw){
  try{
   const devUser=JSON.parse(devRaw);
   if(devUser?.id&&devUser?.email){
    publish({status:'signedIn',user:devUser,recovery:false});
    return devUser as any;
   }
  }catch{}
 }
 const {data,error}=await accountClient().auth.getUser();
 if(error){
  if(error.status===401||error.status===403||error.code==='session_not_found'){publish({status:'signedOut',user:null,recovery:false});throw Error('SESSION_REVOKED');}
  publish({...state,status:state.user?'offline':'signedOut'});throw Error('ACCOUNT_OFFLINE');
 }
 if(!data.user||data.user.is_anonymous||!data.user.email_confirmed_at)throw Error('VERIFIED_ACCOUNT_REQUIRED');
 publish({status:'signedIn',user:{id:data.user.id,email:data.user.email??''},recovery:state.recovery});
 return data.user;
}
export async function loginAccount(email:string,password:string){const {error}=await accountClient().auth.signInWithPassword({email:email.trim(),password});fail(error);await encryptedStorage.removeItem(recoveryKey);publish({...state,recovery:false});await refreshAccount();}
let googleLogin:Promise<void>|undefined;
let googleNativeConfigured=false;
function getGoogleSignin():{GoogleSignin:any,statusCodes:any}|null{
 try{
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod=require('@react-native-google-signin/google-signin');
  if(mod?.GoogleSignin&&typeof mod.GoogleSignin.hasPlayServices==='function'){
   if(!googleNativeConfigured){
    mod.GoogleSignin.configure({
     webClientId:'788483892284-amkurou5m6mhr8ctv8om0abfik2ikds3.apps.googleusercontent.com',
     scopes:['email','profile'],
    });
    googleNativeConfigured=true;
   }
   return mod;
  }
 }catch{}
 return null;
}
export function loginWithGoogle():Promise<void>{
 if(googleLogin)return googleLogin;
 googleLogin=(async()=>{
  if(Platform.OS==='web'){
   const {data,error}=await accountClient().auth.signInWithOAuth({
    provider:'google',
    options:{
     redirectTo:typeof window!=='undefined'?window.location.origin:'http://localhost:8081',
     scopes:'openid email profile',
     skipBrowserRedirect:true,
    },
   });
   fail(error);
   if(data.url&&typeof window!=='undefined'){
    window.location.href=data.url;
   }
   return;
  }
  const googleMod=getGoogleSignin();
  if(googleMod){
   try{
    await googleMod.GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog:true});
    const response=await googleMod.GoogleSignin.signIn();
    const idToken=response.data?.idToken??(response as any).idToken;
    if(!idToken)throw Error('GOOGLE_ACCESS_DENIED');
    const {data,error}=await accountClient().auth.signInWithIdToken({
     provider:'google',
     token:idToken,
    });
    fail(error);
    if(!data.user)throw Error('GOOGLE_ACCESS_DENIED');
    await encryptedStorage.removeItem(recoveryKey);
    publish({...state,recovery:false});
    await refreshAccount();
    return;
   }catch(nativeError:any){
    if(nativeError?.code===googleMod.statusCodes?.SIGN_IN_CANCELLED){
     throw Error('GOOGLE_CANCELLED');
    }
    if(nativeError?.code===googleMod.statusCodes?.IN_PROGRESS){
     throw Error('over_request_rate_limit');
    }
    if(nativeError?.code===googleMod.statusCodes?.PLAY_SERVICES_NOT_AVAILABLE){
     throw Error('GOOGLE_NOT_CONFIGURED');
    }
    if(nativeError instanceof Error&&(nativeError.message==='GOOGLE_CANCELLED'||nativeError.message==='GOOGLE_ACCESS_DENIED')){
     throw nativeError;
    }
    throw nativeError;
   }
  }
  const {data,error}=await accountClient().auth.signInWithOAuth({provider:'google',options:{redirectTo:authRedirect,skipBrowserRedirect:true,scopes:'openid email profile'}});
  fail(error);if(!data.url)throw Error('GOOGLE_NOT_CONFIGURED');
  const result=await WebBrowser.openAuthSessionAsync(googleAuthorizationUrl(data.url,cloudConfig.url,authRedirect),authRedirect);
  if(result.type!=='success')throw Error('GOOGLE_CANCELLED');
  const callback=googleCallback(result.url,authRedirect);
  if(data.flowId&&callback.flowId!==data.flowId)throw Error('INVALID_AUTH_LINK');
  await completeAuthCode(callback.code,callback.flowId);
  await encryptedStorage.removeItem(recoveryKey);publish({...state,recovery:false});
 })().finally(()=>{googleLogin=undefined;});
 return googleLogin;
}
export async function registerAccount(email:string,password:string){const {error}=await accountClient().auth.signUp({email:email.trim(),password,options:{emailRedirectTo:authRedirect}});fail(error);}
export async function resendConfirmation(email:string){const {error}=await accountClient().auth.resend({type:'signup',email:email.trim(),options:{emailRedirectTo:authRedirect}});fail(error);}
export async function requestRecovery(email:string){const {error}=await accountClient().auth.resetPasswordForEmail(email.trim(),{redirectTo:authRedirect});fail(error);}
const exchanges=new Map<string,Promise<void>>();
export function completeAuthCode(code:string,flowId?:string):Promise<void>{if(!code||code.length>4096||flowId!==undefined&&!/^[a-zA-Z0-9_-]{8,64}$/.test(flowId))return Promise.reject(Error('INVALID_AUTH_LINK'));const key=code+'|'+(flowId??'');const previous=exchanges.get(key);if(previous)return previous;const task=(async()=>{const {error}=await accountClient().auth.exchangeCodeForSession(code,flowId?{flowId}:undefined);fail(error);await refreshAccount();})();exchanges.set(key,task);void task.catch(()=>{if(exchanges.get(key)===task)exchanges.delete(key);});if(exchanges.size>4)exchanges.delete(exchanges.keys().next().value!);return task;}
export async function changeRecoveredPassword(password:string){if(!state.recovery)throw Error('RECOVERY_REQUIRED');const {error}=await accountClient().auth.updateUser({password});fail(error);await encryptedStorage.removeItem(recoveryKey);publish({...state,recovery:false});}
export async function loginDevAccount(){
 const devUser={id:'00000000-0000-4000-8000-000000000001',email:'dev@ghovo.local'};
 await encryptedStorage.setItem(devUserKey,JSON.stringify(devUser));
 publish({status:'signedIn',user:devUser,recovery:false});
}
// Borrado de cuenta pedido desde la app. La baja real la ejecuta el servidor: la app
// no puede eliminar su propio usuario de autenticación. Si la llamada falla no se borra
// nada en local, para no dejar al usuario sin cuenta y sin historial por un error de red.
export async function deleteAccount(){
 if(!state.user)throw Error('SIGN_IN_REQUIRED');
 const devRaw=await encryptedStorage.getItem(devUserKey);
 if(devRaw){
  await encryptedStorage.removeItem(devUserKey);
  await encryptedStorage.removeItem(recoveryKey);
  publish({status:'signedOut',user:null,recovery:false});
  return;
 }
 const {error}=await accountClient().rpc('ghovo_delete_account');
 fail(error);
 await accountClient().auth.signOut({scope:'local'}).catch(()=>{});
 await encryptedStorage.removeItem(recoveryKey);
 publish({status:'signedOut',user:null,recovery:false});
}
export async function logoutAccount(){
 const devRaw=await encryptedStorage.getItem(devUserKey);
 if(devRaw){
  await encryptedStorage.removeItem(devUserKey);
  await encryptedStorage.removeItem(recoveryKey);
  publish({status:'signedOut',user:null,recovery:false});
  return;
 }
 const {error}=await accountClient().auth.signOut({scope:'local'});fail(error);await encryptedStorage.removeItem(recoveryKey);publish({status:'signedOut',user:null,recovery:false});
}
export async function accountAccessToken(){
 const devRaw=await encryptedStorage.getItem(devUserKey);
 if(devRaw)return 'dev-access-token';
 const {data,error}=await accountClient().auth.getSession();fail(error);if(!data.session)throw Error('SIGN_IN_REQUIRED');return data.session.access_token;
}
export function accountForeground(active:boolean){if(!accountConfigured)return;try{if(active)void accountClient().auth.startAutoRefresh().catch(()=>{});else void accountClient().auth.stopAutoRefresh().catch(()=>{});}catch{publish({status:'unavailable',user:null,recovery:false});}}
export function accountError(error:unknown){
 const code=error instanceof Error?error.message:String(error);
 const googleMessages:Record<string,string>={GOOGLE_CANCELLED:'Acceso cancelado. Puedes volver a intentarlo cuando quieras.',GOOGLE_ACCESS_DENIED:'Google no ha completado el acceso. Vuelve a intentarlo.',GOOGLE_NATIVE_REQUIRED:'Prueba el acceso con Google desde la aplicación instalada en el móvil.',GOOGLE_NOT_CONFIGURED:'El acceso con Google todavía está pendiente de activar.',provider_disabled:'El acceso con Google todavía está pendiente de activar.',unsupported_provider:'El acceso con Google todavía está pendiente de activar.'};
 if(googleMessages[code])return googleMessages[code];
 const messages:Record<string,string>={invalid_credentials:'El correo o la contraseña no son correctos.',email_not_confirmed:'Confirma primero tu correo. Puedes reenviar la confirmación.',weak_password:'Utiliza una contraseña más larga y difícil de adivinar.',same_password:'Elige una contraseña distinta de la anterior.',over_email_send_rate_limit:'Se ha alcanzado el límite de correos. Espera antes de pedir otro.',over_request_rate_limit:'Demasiados intentos. Espera unos minutos.',email_address_not_authorized:'El envío de correos está limitado a las cuentas del equipo durante las pruebas. Falta conectar el servicio de correo público.',signup_disabled:'El registro está desactivado temporalmente.',flow_state_not_found:'El enlace ha caducado o se abrió en otro dispositivo. Solicita uno nuevo desde este móvil.',bad_code_verifier:'Abre el enlace en el mismo móvil desde el que lo solicitaste.',otp_expired:'El enlace ha caducado. Solicita uno nuevo.',INVALID_AUTH_LINK:'El enlace no es válido. Solicita uno nuevo desde la app.',VERIFIED_ACCOUNT_REQUIRED:'Confirma tu correo antes de consultar la cuenta.',SESSION_REVOKED:'La sesión ya no es válida. Inicia sesión de nuevo.',ACCOUNT_OFFLINE:'No se pudo conectar con GHOVO. Revisa la conexión y vuelve a intentarlo.',AUTH_NOT_CONFIGURED:'Las cuentas todavía no están disponibles.',SECURE_AUTH_UNAVAILABLE:'El acceso seguro no está disponible en esta instalación. Necesita la nueva versión de GHOVO.',RECOVERY_REQUIRED:'Solicita primero un enlace para recuperar el acceso.'};
 return messages[code]??'No se pudo completar la operación. Revisa la conexión e inténtalo de nuevo.';
}
