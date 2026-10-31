import {stableFixes,fixReady} from './gps-quality';
import {recordGpsEvent} from './gps-diagnostics';
import {Platform} from 'react-native';
import {useEffect,useRef,useState} from 'react';
import * as Location from 'expo-location';
import {foregroundLocationPermission} from './location-permission';
import {accepts,type Point} from './core';
export function useGpsPreparation(enabled:boolean,detectWhileMoving=false){
  const [point,setPoint]=useState<Point>();
  const [accuracy,setAccuracy]=useState<number>();
  const [observedPoint,setObservedPoint]=useState<Point>();
  const [message,setMessage]=useState('Buscando GPS…');
  const [now,setNow]=useState(0);
  const [retry,setRetry]=useState(0);
  const permissionAttempted=useRef(false);
  useEffect(()=>{
    if(!enabled)return;
    let disposed=false,stopped=false,watcher:Location.LocationSubscription|undefined;
    let latestFixAt:number|undefined;
    let samples:Point[]=[];
    let searchTimeout:ReturnType<typeof setTimeout>|undefined;
    const stop=()=>{
      stopped=true;clearTimeout(searchTimeout);
      const current=watcher;watcher=undefined;
      try{current?.remove();}catch{/* Permission revocation can invalidate a native subscription. */}
    };
    const fail=(text:string)=>{if(disposed||stopped)return;stop();setPoint(undefined);setAccuracy(undefined);setMessage(text);};
    const start=setTimeout(()=>{setPoint(undefined);setObservedPoint(undefined);setAccuracy(undefined);setMessage('Buscando GPS…');recordGpsEvent('search');setNow(Date.now());void locate();},0);
    const tick=setInterval(()=>{
      if(disposed||stopped)return;
      const time=Date.now();setNow(time);
      if(latestFixAt!==undefined&&time-latestFixAt>15000){recordGpsEvent('lost');fail('Señal GPS perdida. Pulsa Reintentar GPS para buscar de nuevo.');}
    },1000);
    async function locate(){try{
      searchTimeout=setTimeout(()=>{recordGpsEvent('timeout');fail('No se obtuvo una posición precisa. Sal al exterior y pulsa Reintentar GPS.');},20000);
      // A permission Activity backgrounds us. Resuming must not open it again.
      const mayRequest=!permissionAttempted.current;
      permissionAttempted.current=true;
      const permission=await foregroundLocationPermission(mayRequest);
      if(disposed||stopped)return;
      if(permission.status!=='granted'||permission.android?.accuracy==='coarse'){recordGpsEvent('permission');fail('Activa el permiso de ubicación precisa en Ajustes.');return;}
      const services=await Location.hasServicesEnabledAsync();
      if(disposed||stopped)return;
      if(!services){recordGpsEvent('disabled');fail('Activa la ubicación del móvil y reintenta.');return;}
      const subscription=await Location.watchPositionAsync({accuracy:Location.Accuracy.High,timeInterval:1000,distanceInterval:0,mayShowUserSettingsDialog:false},location=>{
        if(disposed||stopped)return;
        const candidate:Point={latitude:location.coords.latitude,longitude:location.coords.longitude,timestamp:location.timestamp,accuracy:location.coords.accuracy??999};
        const age=Date.now()-candidate.timestamp;
        if(location.mocked||age>15000||age < -5000)return;
        if([candidate.latitude,candidate.longitude,candidate.accuracy].every(Number.isFinite)&&Math.abs(candidate.latitude)<=90&&Math.abs(candidate.longitude)<=180&&candidate.accuracy>=0)setObservedPoint(candidate);
        if(Number.isFinite(candidate.accuracy)&&candidate.accuracy>=0)setAccuracy(candidate.accuracy);
        if(!accepts([],candidate)){samples=[];setPoint(undefined);recordGpsEvent('weak',candidate.accuracy);setMessage('Señal aproximada · esperando más precisión.');return;}
        if(detectWhileMoving){clearTimeout(searchTimeout);latestFixAt=candidate.timestamp;}
        samples=stableFixes(samples,candidate);
        if(!fixReady(samples)){setPoint(undefined);setMessage(`Comprobando estabilidad GPS · ${samples.length}/3`);return;}
        recordGpsEvent('stable',candidate.accuracy);
        clearTimeout(searchTimeout);latestFixAt=candidate.timestamp;
        setPoint(candidate);setNow(Date.now());setMessage('Listo para empezar');
      },()=>{recordGpsEvent('provider');fail('El servicio de ubicación ha fallado. Revisa el GPS y pulsa Reintentar GPS.');});
      if(disposed||stopped){try{subscription.remove();}catch{}}else watcher=subscription;
    }catch{fail('No se pudo comprobar el GPS. Pulsa Reintentar GPS.');}}
    return()=>{disposed=true;clearTimeout(start);clearInterval(tick);stop();};
  },[enabled,retry,detectWhileMoving]);
  const ready=enabled&&!!point&&now-point.timestamp<=15000&&now-point.timestamp>=-5000;
  return {point:ready?point:undefined,observedPoint,accuracy,ready,message:ready?'Listo para empezar':point?'Señal GPS perdida · esperando una posición precisa.':message,retry:()=>{void (async()=>{try{if(Platform.OS==='android')await Location.enableNetworkProviderAsync();}catch{/* The user may decline the system settings prompt. */}permissionAttempted.current=false;setRetry(value=>value+1);})();}};
}

