import React,{useCallback,useEffect,useRef,useState} from 'react';
import {Pressable,ScrollView,Text,View} from 'react-native';
import {appStyles as s} from './design';
import {AccountPanel,useAccount} from './AccountPanel';
import {refreshAccount} from './account-client';
import {billingRequest,billingError,monetizationEnforced,claimAdReward,type WalletSnapshot} from './monetization-api';
import {pendingBilling,recoverBilling} from './monetized-tracking';
import {useRewardedAd} from './ads';

function Action({label,onPress,disabled=false}:{label:string;onPress:()=>void;disabled?:boolean}){return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[s.button,s.secondary,{opacity:disabled?0.45:1}]}><Text style={s.lightText}>{label}</Text></Pressable>;}
type Entry={id:string;kind:'initial'|'reward'|'route';delta:number;created_at:string};

export function CreditsScreen({premiumPage,active,onHome,onPremium}:{premiumPage:boolean;active:boolean;onHome:()=>void;onPremium:()=>void}){
 const account=useAccount(),mounted=useRef(true),requestId=useRef(0);
 const owner=account.user?.id;
 const [wallet,setWallet]=useState<WalletSnapshot>(),[entries,setEntries]=useState<Entry[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState(false);
 const {isLoaded,showAd,reloadAd}=useRewardedAd();

 const refresh=useCallback(async()=>{
  if(!owner)return;const request=++requestId.current;
  await refreshAccount();
  const snapshot=await billingRequest<WalletSnapshot>('/v1/account');
  // Initial credit is committed by account retrieval before reading its ledger.
  const [history,journal]=await Promise.all([billingRequest<{entries:Entry[]}>('/v1/transactions'),pendingBilling()]);
  if(snapshot.userId!==owner||!Number.isInteger(snapshot.available)||snapshot.available<0||snapshot.available>50||typeof snapshot.premium!=='boolean'||!Number.isInteger(snapshot.config?.priceMinor)||snapshot.config.priceMinor<1||snapshot.config.priceMinor>100000||!Number.isInteger(snapshot.config.dailyAdLimit)||snapshot.config.dailyAdLimit<0||snapshot.config.dailyAdLimit>100)throw Error('INVALID_WALLET');
  if(!Array.isArray(history.entries)||history.entries.some(entry=>!entry||typeof entry.id!=='string'||!['initial','reward','route'].includes(entry.kind)||!Number.isInteger(entry.delta)||!Number.isFinite(Date.parse(entry.created_at))))throw Error('INVALID_LEDGER');
  if(mounted.current&&request===requestId.current){setWallet(snapshot);setEntries(history.entries);setPending(!!journal);setMessage('');}
 },[owner]);

 useEffect(()=>{mounted.current=true;requestId.current++;const timer=setTimeout(()=>{setWallet(undefined);setEntries([]);setMessage('');if(owner&&!account.recovery)void refresh().catch(error=>{if(mounted.current)setMessage(billingError(error));});},0);return()=>{mounted.current=false;clearTimeout(timer);};},[owner,account.recovery,refresh]);

 async function run(operation:()=>Promise<void>){if(busy)return;setBusy(true);try{await operation();}catch(error){if(mounted.current){setWallet(undefined);setMessage(billingError(error));}}finally{if(mounted.current)setBusy(false);}}

 const currentWallet=wallet?.userId===account.user?.id?wallet:undefined;
 const price=currentWallet?`${(currentWallet.config.priceMinor/100).toFixed(2).replace('.',',')} €`:'4,99 €';

 const canWatchAd=!!currentWallet&&!currentWallet.premium&&isLoaded&&!active&&currentWallet.adsRemaining>0&&currentWallet.available<50&&!busy;

 const onWatchAd=()=>{
  if(!canWatchAd)return;
  void run(async()=>{
   const shown=await showAd(async()=>{
    try{
     await claimAdReward();
     await refresh();
     if(mounted.current)setMessage('¡Recompensa confirmada! +1 crédito añadido a tu cuenta.');
    }catch(e){
     if(mounted.current)setMessage(billingError(e));
    }
   });
   if(!shown){reloadAd();}
  });
 };

 return <View style={{flex:1}}>
  <View style={s.header}><Action label="← Inicio" onPress={onHome}/><Text style={s.cardTitle}>{premiumPage?'GHOVO Premium':'Tu cuenta'}</Text></View>
  <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
   {(!premiumPage||!account.user)&&<AccountPanel active={active}/>}
   {!monetizationEnforced&&<Text style={s.caption}>Monetización sin activar: esta versión de pruebas mantiene los recorridos disponibles.</Text>}
   {!premiumPage&&<View style={s.card}>
    <Text style={s.eyebrow}>CRÉDITOS</Text><Text style={s.resultTitle}>{currentWallet?.premium?'Premium · rutas ilimitadas':currentWallet?`${currentWallet.available} créditos disponibles`:'Saldo sin verificar'}</Text>
    <Text style={s.caption}>{currentWallet?'Saldo consultado en el servidor. No caduca.':'Inicia sesión para consultar el saldo verificado de tu cuenta.'}</Text>
    {!!message&&<Text accessibilityLiveRegion="polite" style={s.muted}>{message}</Text>}
    {!!currentWallet?.reserved&&<Text style={s.muted}>{currentWallet.reserved} crédito reservado para un inicio pendiente; todavía no se ha consumido.</Text>}
    {!!account.user&&<Action label="Actualizar saldo" disabled={busy||account.recovery} onPress={()=>void run(refresh)}/>}
    {pending&&<Action label="Revisar inicio pendiente" disabled={busy||account.recovery} onPress={()=>void run(async()=>{await recoverBilling();await refresh();})}/>}
   </View>}
   {!premiumPage&&<View style={s.card}>
    <Text style={s.cardTitle}>Conseguir créditos</Text><Text style={s.muted}>Mira un anuncio y consigue una ruta gratis.</Text><Text style={s.caption}>1 recompensa confirmada = 1 crédito. Máximo {currentWallet?.config.dailyAdLimit??10} al día y hasta 50 acumulados. No caducan.</Text>
    {currentWallet&&!currentWallet.premium&&<Text style={s.caption}>Recompensas restantes hoy: {currentWallet.adsRemaining}. La disponibilidad de anuncios depende del proveedor.</Text>}
    <Action label="Ver anuncio para conseguir 1 crédito" disabled={!canWatchAd} onPress={onWatchAd}/>
    <Text style={s.caption}>{active?'No se permiten anuncios con una ruta activa.':!account.user?'Inicia sesión para conseguir créditos.':currentWallet?.premium?'Tu cuenta ya tiene Premium activo con rutas ilimitadas.':currentWallet&&currentWallet.adsRemaining<=0?'Has alcanzado el límite diario de anuncios recompensados.':currentWallet&&currentWallet.available>=50?'Has alcanzado el límite máximo de créditos (50).':!isLoaded?'Cargando anuncio de prueba... Espera unos instantes.':'Al completar el vídeo se sumará 1 crédito automáticamente a tu saldo.'}</Text>
    <Action label="Pasar a Premium" disabled={busy} onPress={onPremium}/>
   </View>}
   {premiumPage&&<View style={s.card}><Text style={s.eyebrow}>PAGO ÚNICO · SIN SUSCRIPCIONES</Text><Text style={s.resultTitle}>{currentWallet?.premium?'Premium verificado':`Precio previsto: ${price}`}</Text><Text style={s.muted}>Rutas ilimitadas de por vida, sin créditos ni anuncios y con las funciones actuales de GHOVO.</Text><Text style={s.caption}>El precio definitivo lo mostrará la tienda antes de confirmar. No hay cuotas mensuales ni anuales.</Text><Action label="Comprar Premium" disabled onPress={()=>{}}/><Action label="Restaurar compra" disabled onPress={()=>{}}/><Text style={s.caption}>Compras y restauración pendientes de conectar a Google Play. No se realiza ningún cobro desde esta pantalla. Si ya eres Premium, tus créditos se conservan.</Text>{!!message&&<Text style={s.muted}>{message}</Text>}</View>}
   {!premiumPage&&currentWallet&&!!entries.length&&<View style={s.card}><Text style={s.cardTitle}>Últimos movimientos</Text>{entries.map(entry=><View key={entry.id} style={s.row}><View style={{flex:1,gap:4}}><Text style={s.lightText}>{entry.kind==='initial'?'Créditos iniciales':entry.kind==='reward'?'Recompensa verificada':'Inicio de ruta'}</Text><Text style={s.caption}>{new Date(entry.created_at).toLocaleString('es-ES')}</Text></View><Text style={s.lightText}>{entry.delta>0?'+':''}{entry.delta}</Text></View>)}</View>}
  </ScrollView>
 </View>;
}
