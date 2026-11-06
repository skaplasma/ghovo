import React,{useEffect,useRef,useState,useSyncExternalStore} from 'react';
import { t as tr } from './i18n-core';
import {Image,Pressable,Text,TextInput,View} from 'react-native';
import {appStyles as s} from './design';
import {accountConfigured,accountSnapshot,subscribeAccount,initializeAccounts,loginAccount,loginWithGoogle,loginDevAccount,registerAccount,resendConfirmation,requestRecovery,changeRecoveredPassword,logoutAccount,refreshAccount,accountError} from './account-client';
export const useAccount=()=>useSyncExternalStore(subscribeAccount,accountSnapshot,accountSnapshot);
function Action({label,onPress,disabled=false}:{label:string;onPress:()=>void;disabled?:boolean}){return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[s.button,s.secondary,{opacity:disabled?0.45:1}]}><Text style={s.lightText}>{label}</Text></Pressable>;}
const validEmail=(email:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
export function AccountPanel({active}:{active:boolean}){
 const account=useAccount(),mounted=useRef(true),locked=useRef(false);
 const [mode,setMode]=useState<'login'|'signup'|'reset'>('login'),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{mounted.current=true;void initializeAccounts();return()=>{mounted.current=false;};},[]);
 useEffect(()=>{const timer=setTimeout(()=>{setPassword('');setRepeat('');setMode('login');},0);return()=>clearTimeout(timer);},[account.user?.id,account.recovery]);
 async function perform(operation:()=>Promise<void>,success?:string){if(locked.current||active)return;locked.current=true;setBusy(true);setMessage('');try{await operation();if(mounted.current&&success)setMessage(success);}catch(error){if(mounted.current)setMessage(accountError(error));}finally{locked.current=false;if(mounted.current){setBusy(false);setPassword('');setRepeat('');}}}
 const disabled=busy||active;
 if(!accountConfigured)return <View style={s.card}><Text style={s.cardTitle}>{tr("Cuenta todavía sin conectar")}</Text><Text style={s.muted}>{tr("Las cuentas no están activadas en esta versión.")}</Text></View>;
 return <View style={s.card}>
  <Text style={s.eyebrow}>{tr("TU CUENTA GHOVO")}</Text>
  {!!message&&<Text accessibilityLiveRegion="polite" style={s.muted}>{message}</Text>}
  {active&&<Text style={s.caption}>{tr("Finaliza el recorrido antes de cambiar de cuenta.")}</Text>}
  {account.status==='loading'?<Text style={s.muted}>{tr("Comprobando tu sesión…")}</Text>:account.recovery?<>
   <Text style={s.cardTitle}>{tr("Elige tu nueva contraseña")}</Text><Text style={s.caption}>{tr("El enlace de recuperación ha verificado tu acceso. Utiliza al menos 10 caracteres.")}</Text>
   <TextInput accessibilityLabel={tr("Nueva contraseña")} secureTextEntry value={password} onChangeText={setPassword} editable={!disabled} maxLength={128} style={s.input}/>
   <TextInput accessibilityLabel={tr("Repite la nueva contraseña")} secureTextEntry value={repeat} onChangeText={setRepeat} editable={!disabled} maxLength={128} style={s.input}/>
   <Action label={tr("Guardar nueva contraseña")} disabled={disabled||password.length<10||password!==repeat} onPress={()=>void perform(()=>changeRecoveredPassword(password),'Contraseña actualizada.')}/>
   <Action label={tr("Cerrar sesión")} disabled={disabled} onPress={()=>void perform(logoutAccount)}/>
  </>:account.user?<>
   <View style={{alignItems:'center',gap:6,paddingBottom:12}}>
    <View style={{width:84,height:84,borderRadius:42,backgroundColor:'#2A1F4D',borderWidth:2,borderColor:'#8B5CF6',alignItems:'center',justifyContent:'center',marginBottom:4}}>
     <Image source={require('../assets/ghovo-logo-3d-v1.png')} style={{width:58,height:58}} resizeMode="contain" />
    </View>
    <Text style={{color:'#ffffff',fontSize:17,fontWeight:'700',letterSpacing:-0.3}}>{account.user.email}</Text>
   </View>
   <Text style={s.eyebrow}>{tr("TU CUENTA")}</Text>
   <Text style={s.caption}>{account.status==='offline'?'Sin conexión: no se ha podido comprobar la sesión con el servidor.':'La sesión se conserva de forma segura en este dispositivo.'}</Text>
   <Action label={tr("Comprobar cuenta")} disabled={disabled} onPress={()=>void perform(async()=>{await refreshAccount();},'Cuenta comprobada.')}/>
  </>:<>
   <Text style={s.cardTitle}>{mode==='signup'?'Crea tu cuenta':mode==='reset'?'Recupera tu acceso':'Inicia sesión'}</Text>
   {mode!=='reset'&&<>
    {__DEV__&&<Pressable accessibilityRole="button" accessibilityLabel={tr("Acceso rápido local")} accessibilityState={{disabled}} disabled={disabled} onPress={()=>void perform(loginDevAccount)} style={[s.button,{backgroundColor:'#00e5a3',marginBottom:10,opacity:disabled?0.45:1}]}><Text style={[s.buttonText,{color:'#0d1b1e',fontWeight:'bold'}]}>⚡ Acceso rápido (Dev Local)</Text></Pressable>}
    <Pressable accessibilityRole="button" accessibilityLabel={tr("Continuar con Google")} accessibilityState={{disabled}} disabled={disabled} onPress={()=>void perform(loginWithGoogle)} style={[s.button,{backgroundColor:'#ffffff',opacity:disabled?0.45:1}]}><Text style={[s.buttonText,{color:'#1f1f1f'}]}>{tr("Continuar con Google")}</Text></Pressable>
    <Text style={s.caption}>{tr("Usa tu cuenta de Google, sin crear otra contraseña.")}</Text>
    <Text style={s.eyebrow}>{tr("O CONTINÚA CON TU CORREO")}</Text>
   </>}
   <Text style={s.caption}>{mode==='signup'?'Confirma tu correo para recibir tus créditos iniciales una sola vez.':mode==='reset'?'Te enviaremos un enlace para elegir una contraseña nueva.':'Entra con el mismo correo para conservar tu saldo al cambiar de móvil.'}</Text>
   <TextInput accessibilityLabel={tr("Correo de la cuenta GHOVO")} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} editable={!disabled} maxLength={254} placeholder={tr("Correo electrónico")} placeholderTextColor="#80949b" style={s.input}/>
   {mode!=='reset'&&<TextInput accessibilityLabel={tr("Contraseña de la cuenta GHOVO")} secureTextEntry value={password} onChangeText={setPassword} editable={!disabled} maxLength={128} placeholder={mode==='signup'?'Contraseña · mínimo 10 caracteres':'Contraseña'} placeholderTextColor="#80949b" style={s.input}/>}
   {mode==='signup'&&<TextInput accessibilityLabel={tr("Repite la contraseña")} secureTextEntry value={repeat} onChangeText={setRepeat} editable={!disabled} maxLength={128} placeholder={tr("Repite la contraseña")} placeholderTextColor="#80949b" style={s.input}/>}
   {mode==='login'?<>
    <Action label={tr("Iniciar sesión")} disabled={disabled||!validEmail(email)||!password} onPress={()=>void perform(()=>loginAccount(email,password))}/>
    <Action label={tr("Crear cuenta")} disabled={disabled} onPress={()=>{setMode('signup');setPassword('');setRepeat('');setMessage('');}}/>
    <Action label={tr("He olvidado mi contraseña")} disabled={disabled} onPress={()=>{setMode('reset');setPassword('');setMessage('');}}/>
    <Action label={tr("Reenviar confirmación")} disabled={disabled||!validEmail(email)} onPress={()=>void perform(()=>resendConfirmation(email),'Si hay una cuenta pendiente, recibirás otro enlace de confirmación.')}/>
   </>:mode==='signup'?<>
    <Action label={tr("Registrarme")} disabled={disabled||!validEmail(email)||password.length<10||password!==repeat} onPress={()=>void perform(()=>registerAccount(email,password),'Revisa tu correo para confirmar la cuenta. Abre el enlace en este móvil y vuelve a GHOVO.')}/>
    <Action label={tr("Ya tengo cuenta")} disabled={disabled} onPress={()=>{setMode('login');setPassword('');setRepeat('');setMessage('');}}/>
   </>:<>
    <Action label={tr("Enviar enlace de recuperación")} disabled={disabled||!validEmail(email)} onPress={()=>void perform(()=>requestRecovery(email),'Si existe una cuenta con ese correo, recibirás un enlace. Ábrelo en este mismo móvil.')}/>
    <Action label={tr("Volver al acceso")} disabled={disabled} onPress={()=>{setMode('login');setMessage('');}}/>
   </>}
  </>}
 </View>;
}
