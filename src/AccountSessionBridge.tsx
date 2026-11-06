import { t as tr } from './i18n-core';
import {useEffect} from 'react';
import {AppState} from 'react-native';
import {accountConfigured,accountForeground,initializeAccounts} from './account-client';
export function AccountSessionBridge(){
 useEffect(()=>{if(!accountConfigured)return;void initializeAccounts();accountForeground(AppState.currentState==='active');const listener=AppState.addEventListener('change',state=>accountForeground(state==='active'));return()=>{listener.remove();accountForeground(false);};},[]);
 return null;
}
