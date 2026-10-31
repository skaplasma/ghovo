import {AppState} from 'react-native';
import {foregroundLocationPermission} from './location-permission';
import {stableFixes,fixReady} from './gps-quality';
import {recordGpsEvent} from './gps-diagnostics';
import {checkpointNotice,entryNotice} from './notices';
import {completeRun} from './completion';
import {routeEntry,referenceForRun} from './route-entry';
import {speakNotice} from './speech';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {advanceComparison,arrivalReady,courseModel,initialComparison,type CourseModel} from './comparison';
import { accepts,length, appendFix, type Point, type Run } from './core';
import { active,history, serial, write,writeMany } from './storage';
let cachedModel:CourseModel|undefined;let cachedInterval:Run['checkpointKm'];
function modelFor(reference:Run,interval:Run['checkpointKm']){if(cachedModel?.reference!==reference||cachedInterval!==interval){cachedModel=courseModel(reference,interval);cachedInterval=interval;}return cachedModel;}
export const TASK='ghovo-route-location';
TaskManager.defineTask<{locations:Location.LocationObject[]}>(TASK,async({data,error})=>{
  await serial(async()=>{
    let run=await active(); if(!run)return;
    if(error){recordGpsEvent('provider');await write('active',{...run,error:error.message});return;}
    const previous=run.referenceId?(await history()).find(r=>r.id===run!.referenceId&&r.routeId===run!.routeId&&r.mode===run!.mode):undefined;
    let newNotice=false;
    for(const loc of (data?.locations??[]).sort((a,b)=>a.timestamp-b.timestamp)) {
      if(loc.mocked || loc.timestamp < run.startedAt || loc.timestamp>Date.now()+5000) continue;
      const p:Point={latitude:loc.coords.latitude,longitude:loc.coords.longitude,timestamp:loc.timestamp,accuracy:loc.coords.accuracy??999};
      const updated=appendFix(run,p);
      const accepted=updated.lastFixAt===p.timestamp&&p.timestamp>(run.lastFixAt??run.startedAt);
      if(previous&&!updated.circuitStartedAt&&accepted){
        if(run.comparison){
          updated.circuitStartedAt=run.startedAt;
        }else{
          const atStart=run.points[0]&&routeEntry(previous,run.points[0]);
          const entry=atStart||routeEntry(previous,p);
          if(entry){
            updated.circuitStartedAt=atStart?run.points[0].timestamp:p.timestamp;
            updated.referenceOffsetMs=entry.offset;
            updated.comparison=initialComparison(updated.circuitStartedAt);
            updated.notice=entryNotice(updated,updated.circuitStartedAt);
            newNotice=true;
          }
        }
      }
      const effective=referenceForRun(updated,previous);
      const model=effective?modelFor(effective,updated.checkpointKm):undefined;
      const circuitBase=updated.circuitStartedAt??(updated.comparison?updated.startedAt:undefined);
      if(model&&accepted&&circuitBase){
        updated.comparison=advanceComparison(model,updated.comparison??initialComparison(circuitBase),p,circuitBase,loc.coords.speed??undefined);
      }
      if(model&&accepted&&circuitBase){
        const previousSplits=run.comparison?.splits.length??0;
        const crossed=updated.comparison?.splits.slice(previousSplits).filter(split=>split.meters<model.total-0.01)??[];
        if(crossed.length){
          updated.notice=checkpointNotice(updated,crossed.at(-1)!,p.timestamp);
          newNotice=true;
        }
      }
      if(accepted&&p.timestamp-(run.lastFixAt??run.startedAt)>30000)recordGpsEvent('recovered',p.accuracy);
      if(!accepted&&p.timestamp>(run.lastFixAt??run.startedAt))recordGpsEvent(!accepts([],p)?'weak':'jump',p.accuracy);
      run=updated;
      if(accepted&&model&&run.autoFinish&&run.comparison&&arrivalReady(run.comparison,p.timestamp)&&run.points.length>=2&&length(run.points)>=50){
        const completed=completeRun(run,previous,p.timestamp,true);
        const saved=await history();
        try{await writeMany({history:[...saved.filter(item=>item.id!==completed.id),completed],lastResult:completed.id,active:null},true);}
        catch{recordGpsEvent('save_failed');await write('active',{...run,error:'No se pudo guardar la llegada. La grabación se conserva; puedes pulsar Finalizar ruta para reintentar.'});return;}
        void speakNotice(completed.notice!,completed.voiceEnabled!==false).catch(()=>{});
        void stopTracking().catch(()=>{});
        return;
      }
    }
    await write('active',run);
    if(newNotice&&run.notice)void speakNotice(run.notice,run.voiceEnabled!==false).catch(()=>{});
  });
});
export function getFreshFix(timeoutMs=25000):Promise<Point> {
  return new Promise((resolve,reject)=>{
    let done=false,subscription:Location.LocationSubscription|undefined;
    let samples:Point[]=[];
    const finish=(error?:Error,point?:Point)=>{
      if(done)return;done=true;clearTimeout(timer);try{subscription?.remove();}catch{/* Native subscription may already be stopped. */}
      if(error)reject(error);else resolve(point!);
    };
    const timer=setTimeout(()=>finish(Error(`No se obtuvo una señal GPS precisa en ${Math.ceil(timeoutMs/1000)} segundos. Sal al exterior y reintenta.`)),timeoutMs);
    try { void Location.watchPositionAsync({accuracy:Location.Accuracy.High,timeInterval:1000,distanceInterval:0,mayShowUserSettingsDialog:false},location=>{
      const p:Point={latitude:location.coords.latitude,longitude:location.coords.longitude,timestamp:location.timestamp,accuracy:location.coords.accuracy??999};
      const age=Date.now()-p.timestamp;
      if(location.mocked||age>15000||age < -5000)return;
      if(!accepts([],p)){samples=[];return;}
      samples=stableFixes(samples,p);if(!fixReady(samples))return;
      finish(undefined,p);
    },reason=>finish(Error('El servicio GPS ha fallado. Revisa la ubicación y reintenta. '+reason))).then(value=>{subscription=value;if(done){try{value.remove();}catch{}}}).catch(error=>finish(error instanceof Error?error:Error(String(error))));
    } catch(error) { finish(error instanceof Error?error:Error(String(error))); }
  });
}
// Keep receiving a heartbeat when stationary; appendFix removes jitter from geometry.
// A positive distance filter would otherwise make a normal rest look like lost GPS.
const trackingOptions:Location.LocationTaskOptions={accuracy:Location.Accuracy.High,timeInterval:2000,distanceInterval:0,pausesUpdatesAutomatically:false,foregroundService:{notificationTitle:'GHOVO · grabando ruta',notificationBody:'Ubicación activa. Detén la grabación cuando estés a salvo.',killServiceOnDestroy:false}};
export async function startTracking(run:Run,_origin?:Point,prepared?:Point) {
  if(await active())throw Error('Ya hay un recorrido en curso. Finalízalo o descártalo antes de comenzar otro.');
  if(!(await Location.hasServicesEnabledAsync()))throw Error('Activa la ubicación del dispositivo.');
  const foreground=await foregroundLocationPermission(true);
  if(foreground.status!=='granted'||foreground.android?.accuracy==='coarse')throw Error('Activa el permiso de ubicación precisa de GHOVO en Ajustes.');
  const background=await Location.getBackgroundPermissionsAsync();
  if(background.status!=='granted'&&(await Location.requestBackgroundPermissionsAsync()).status!=='granted')throw Error('Permite ubicación en segundo plano para grabar con la pantalla bloqueada.');
  const point=prepared??await getFreshFix();
  const [permissionNow,servicesNow]=await Promise.all([Location.getForegroundPermissionsAsync(),Location.hasServicesEnabledAsync()]);
  if(!servicesNow||permissionNow.status!=='granted'||permissionNow.android?.accuracy==='coarse')throw Error('La ubicación se ha desactivado o ha cambiado el permiso. No se ha iniciado la ruta.');
  if(!accepts([],point)||Date.now()-point.timestamp>15000||point.timestamp>Date.now()+5000)throw Error('La posición GPS ha caducado o no es precisa. Reintenta para iniciar la ruta.');
  run.startedAt=point.timestamp;
  run.lastFixAt=point.timestamp;
  run.lastAccuracy=point.accuracy;
  run.points=[point];
  if(run.referenceId){
    const reference=(await history()).find(item=>item.id===run.referenceId&&item.routeId===run.routeId&&item.mode===run.mode);
    if(!reference||!courseModel(reference,run.checkpointKm).valid)throw Error('La referencia ya no está disponible o tiene cortes GPS. Elige otra.');
    const entry=routeEntry(reference,point);
    if(entry){
      run.circuitStartedAt=point.timestamp;
      run.referenceOffsetMs=entry.offset;
      run.comparison=initialComparison(point.timestamp);
      run.notice=entryNotice(run,point.timestamp);
    }
  }
  await serial(async()=>{if(await active())throw Error('Ya hay un recorrido en curso.');await write('active',run);});
  try {await Location.startLocationUpdatesAsync(TASK,{...trackingOptions,timeInterval:run.mode==='driving'?1000:2000});}catch(e){await serial(async()=>{if((await active())?.id===run.id)await write('active',null);});throw e;}
  if(run.notice)void speakNotice(run.notice,run.voiceEnabled!==false).catch(()=>{});
}
export async function stopTracking(){if(await Location.hasStartedLocationUpdatesAsync(TASK))await Location.stopLocationUpdatesAsync(TASK);}
export async function resumeTracking() {
  const pending=await active();if(!pending)throw Error('No hay una grabación pendiente para reanudar.');
  if(!(await Location.hasServicesEnabledAsync()))throw Error('Activa la ubicación del dispositivo.');
  const foreground=await foregroundLocationPermission(true);
  if(foreground.status!=='granted'||foreground.android?.accuracy==='coarse'||(await Location.getBackgroundPermissionsAsync()).status!=='granted')throw Error('Revisa los permisos de ubicación precisa y en segundo plano de GHOVO en Ajustes.');
  await stopTracking();
  await Location.startLocationUpdatesAsync(TASK,{...trackingOptions,timeInterval:pending.mode==='driving'?1000:2000});
}
export const trackingRunning=()=>Location.hasStartedLocationUpdatesAsync(TASK);
export async function ensureTracking(){
  if(await active()&&!(await trackingRunning())){
    await resumeTracking();
    // A final save may have completed while native permission checks were pending.
    if(!(await active()))await stopTracking();
  }
}
let recoveryState:{id:string;fix:number;attempts:number;at:number}|undefined;
// Called by the foreground monitor. The native location service remains responsible in background.
export async function recoverTracking(){
    if(AppState.currentState==='background'||AppState.currentState==='inactive')return;
    const run=await active();if(!run)return;
    const now=Date.now(),fix=run.lastFixAt??run.startedAt;
    const running=await trackingRunning();
    if(running&&now-fix<=30000)return;
    if(!recoveryState||recoveryState.id!==run.id||recoveryState.fix!==fix)recoveryState={id:run.id,fix,attempts:0,at:0};
    if(recoveryState.attempts>=3||now-recoveryState.at<30000*2**Math.max(0,recoveryState.attempts-1))return;
    recoveryState.at=now;recoveryState.attempts++;
    try{
      const [enabled,foreground,background]=await Promise.all([Location.hasServicesEnabledAsync(),Location.getForegroundPermissionsAsync(),Location.getBackgroundPermissionsAsync()]);
      if(!enabled||foreground.status!=='granted'||foreground.android?.accuracy==='coarse'||background.status!=='granted'){
        recordGpsEvent('recovery_blocked');await recoveryMessage(run.id,'Revisa ubicación y permisos. La ruta guardada se conserva.');return;
      }
      if(AppState.currentState==='background'||AppState.currentState==='inactive')return;
      if((await active())?.id!==run.id)return;
      recordGpsEvent('recovery');
      if(running)await Location.stopLocationUpdatesAsync(TASK);
      if((await active())?.id!==run.id)return;
      await Location.startLocationUpdatesAsync(TASK,{...trackingOptions,timeInterval:run.mode==='driving'?1000:2000});
      // Only a new valid fix confirms recovery, never merely restarting the service.
      await recoveryMessage(run.id,'Intentando recuperar GPS. Esperando una posición precisa.');
    }catch{recordGpsEvent('recovery_failed');await recoveryMessage(run.id,'No se pudo recuperar el GPS. Revisa los permisos o reintenta manualmente.');}
}
async function recoveryMessage(id:string,message:string){await serial(async()=>{const current=await active();if(current?.id===id)await write('active',{...current,error:message});});}
