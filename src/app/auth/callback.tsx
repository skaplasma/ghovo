import React,{useEffect,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import {router,useLocalSearchParams} from 'expo-router';
import {completeAuthCode,accountError} from '../../account-client';
import {appStyles as s} from '../../design';
export default function AuthCallback(){
 const {code,sb_flow_id:flowId}=useLocalSearchParams<{code?:string|string[];sb_flow_id?:string|string[]}>();
 const [message,setMessage]=useState('Comprobando tu enlace de acceso…');
 useEffect(()=>{let live=true;if(typeof code!=='string'||!code||code.length>4096||flowId!==undefined&&typeof flowId!=='string'){const timer=setTimeout(()=>{if(live)setMessage('El enlace no es válido. Solicita uno nuevo desde la app.');},0);return()=>{live=false;clearTimeout(timer);};}
  void completeAuthCode(code,flowId as string|undefined).then(()=>{if(live)router.replace('/credits');}).catch(error=>{if(live)setMessage(accountError(error));});return()=>{live=false;};
 },[code,flowId]);
 return <View style={[s.root,s.content]}><Text style={s.title}>Tu cuenta GHOVO</Text><Text accessibilityLiveRegion="polite" style={s.muted}>{message}</Text><Pressable accessibilityRole="button" onPress={()=>router.replace('/credits')} style={s.button}><Text style={s.buttonText}>Ir a mi cuenta</Text></Pressable></View>;
}
