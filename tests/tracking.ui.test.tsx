import {speakNotice} from '../src/speech';
import {writeMany} from '../src/storage';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { ensureTracking, getFreshFix, startTracking, resumeTracking, recoverTracking } from '../src/tracking';
import type { Run } from '../src/core';
jest.mock('../src/speech',()=>({speakNotice:jest.fn(async()=>true),stopVoice:jest.fn(async()=>{}),testVoice:jest.fn(async()=>true)}));
let mockActive:Run|null;
let mockHistory:Run[]=[];
let mockResult:string|null=null;
let mockFix:((location:Location.LocationObject)=>void)|undefined;
const mockRemove=jest.fn();
jest.mock('expo-location',()=>({
  Accuracy:{High:4},
  hasServicesEnabledAsync:jest.fn(async()=>true),
  requestForegroundPermissionsAsync:jest.fn(async()=>({status:'granted',android:{accuracy:'fine'}})),
  requestBackgroundPermissionsAsync:jest.fn(async()=>({status:'granted'})),
  getForegroundPermissionsAsync:jest.fn(async()=>({status:'granted',android:{accuracy:'fine'}})),
  getBackgroundPermissionsAsync:jest.fn(async()=>({status:'granted'})),
  watchPositionAsync:jest.fn(async(_options,callback)=>{mockFix=callback;return {remove:mockRemove};}),
  startLocationUpdatesAsync:jest.fn(async()=>{}),
  stopLocationUpdatesAsync:jest.fn(async()=>{}),
  hasStartedLocationUpdatesAsync:jest.fn(async()=>false),
}));
jest.mock('expo-task-manager',()=>({defineTask:jest.fn()}));
jest.mock('../src/storage',()=>({
  history:jest.fn(async()=>mockHistory),writeMany:jest.fn(async values=>{if('history' in values)mockHistory=values.history;if('active' in values)mockActive=values.active;if('lastResult' in values)mockResult=values.lastResult;}),
  active:jest.fn(async()=>mockActive),serial:jest.fn(async fn=>fn()),
  write:jest.fn(async(key,value)=>{if(key==='active')mockActive=value;}),
  saveActive:jest.fn(async(run:Run)=>{mockActive=run;}),
}));
const executeTask=jest.mocked(TaskManager.defineTask).mock.calls[0][1];
const run=():Run=>({id:'pending',routeId:'route',name:'Test',startedAt:Date.now(),points:[]});
const location=(overrides:Partial<Location.LocationObject>={}):Location.LocationObject=>({timestamp:Date.now(),coords:{latitude:40,longitude:-3,accuracy:5,altitude:null,altitudeAccuracy:null,speed:null,heading:null},...overrides});
beforeEach(()=>{jest.useFakeTimers({now:1700000000000});mockActive=null;mockHistory=[];mockResult=null;mockFix=undefined;});
afterEach(()=>{jest.useRealTimers();});
test('fresh fix ignores stale and imprecise data and releases its watcher',async()=>{
  const pending=getFreshFix(1000);await Promise.resolve();
  mockFix!(location({timestamp:Date.now()-20000}));
  mockFix!(location({timestamp:Date.now()+10000}));
  mockFix!(location({coords:{...location().coords,accuracy:100}}));
  [-2000,-1000,0].forEach(offset=>mockFix!(location({timestamp:Date.now()+offset})));
  const point=await pending;expect(point.accuracy).toBe(5);expect(point.timestamp).toBe(Date.now());expect(mockRemove).toHaveBeenCalled();
});
test('fresh fix times out and ignores late callbacks',async()=>{
  const pending=getFreshFix(1000);const checked=expect(pending).rejects.toThrow('1 segundos');
  await jest.advanceTimersByTimeAsync(1001);await checked;
  [-2000,-1000,0].forEach(offset=>mockFix!(location({timestamp:Date.now()+offset})));expect(mockRemove).toHaveBeenCalled();
});
test('existing draft cannot be overwritten by a second start',async()=>{
  mockActive=run();const previous=mockActive;
  await expect(startTracking(run())).rejects.toThrow('Ya hay un recorrido');
  expect(mockActive).toBe(previous);expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
});
test('coarse Android permission is rejected before saving a draft',async()=>{
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce({status:'granted',android:{accuracy:'coarse'}} as Location.LocationPermissionResponse);
  await expect(startTracking(run())).rejects.toThrow('ubicación precisa');expect(mockActive).toBeNull();
});
test('a recording without comparison may start outside the old A radius',async()=>{
  const pending=startTracking(run(),{latitude:41,longitude:-3,timestamp:0,accuracy:5});
  await jest.advanceTimersByTimeAsync(1);[-2000,-1000,0].forEach(offset=>mockFix!(location({timestamp:Date.now()+offset})));await pending;
  expect(mockActive).not.toBeNull();expect(Location.startLocationUpdatesAsync).toHaveBeenCalled();
});
test('a saved route may start in its middle and aligns the reference offset',async()=>{
 const now=Date.now();const points=Array.from({length:101},(_,i)=>({latitude:0,longitude:i*10/111195,timestamp:now-500000+i*1000,accuracy:5}));mockHistory=[{id:'ref',routeId:'route',name:'Test',startedAt:points[0].timestamp,endedAt:points.at(-1)!.timestamp,points}];const draft={...run(),referenceId:'ref'};
 await startTracking(draft,points[0],{...points[40],timestamp:now});
 // Seguro de arranque: la primera posición sobre el trazado solo deja la entrada pendiente.
 expect(mockActive?.entryPendingAt).toBe(now);expect(mockActive?.circuitStartedAt).toBeUndefined();
 const second=points[41];
 await executeTask({data:{locations:[location({timestamp:now+1000,coords:{...location().coords,latitude:second.latitude,longitude:second.longitude}})]},error:null,executionInfo:{eventId:'entry',taskName:'ghovo-route-location',appState:'background'}} as never);
 expect(mockActive?.circuitStartedAt).toBe(now+1000);expect(mockActive?.referenceOffsetMs).toBeGreaterThan(39000);expect(mockActive?.startedAt).toBe(now);expect(mockActive?.points).toHaveLength(2);
});

test('failed native service start removes only the newly created draft',async()=>{
  jest.mocked(Location.startLocationUpdatesAsync).mockRejectedValueOnce(Error('Servicio no disponible'));
  const pending=startTracking(run());const checked=expect(pending).rejects.toThrow('Servicio no disponible');
  await jest.advanceTimersByTimeAsync(1);[-2000,-1000,0].forEach(offset=>mockFix!(location({timestamp:Date.now()+offset})));await checked;
  expect(mockActive).toBeNull();
});
test('resume without a pending recording cannot launch GPS',async()=>{
  await expect(resumeTracking()).rejects.toThrow('No hay una grabación');expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
});
test('background task sorts batches, drops mocks, and preserves a new valid fix',async()=>{
  mockActive={...run(),points:[{latitude:40,longitude:-3,timestamp:Date.now()-2000,accuracy:5}],startedAt:Date.now()-2000};
  await executeTask({data:{locations:[
    location({timestamp:Date.now(),coords:{...location().coords,longitude:-2.99988}}),
    location({timestamp:Date.now()-1000,coords:{...location().coords,longitude:-2.99994}}),
    location({timestamp:Date.now()-500,mocked:true,coords:{...location().coords,longitude:-2}}),
  ]},error:null,executionInfo:{eventId:'test',taskName:'ghovo-route-location',appState:'background'}} as never);
  expect(mockActive!.points.length).toBe(3);expect(mockActive!.lastFixAt).toBe(Date.now());
  expect(mockActive!.points[1].timestamp).toBe(Date.now()-1000);
});
test('successful start requests stationary heartbeats and a visible Android service',async()=>{
  const pending=startTracking(run());
  await jest.advanceTimersByTimeAsync(1);[-2000,-1000,0].forEach(offset=>mockFix!(location({timestamp:Date.now()+offset})));await pending;
  expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith('ghovo-route-location',expect.objectContaining({
    timeInterval:2000,distanceInterval:0,pausesUpdatesAutomatically:false,
    foregroundService:expect.objectContaining({notificationTitle:'GHOVO · grabando ruta'}),
  }));
  expect(mockActive!.points).toHaveLength(1);expect(mockActive!.lastFixAt).toBe(Date.now());
});
test('resting still updates heartbeat without inflating distance or reporting a GPS gap',async()=>{
  const now=Date.now();mockActive={...run(),startedAt:now-60000,points:[{latitude:40,longitude:-3,timestamp:now-60000,accuracy:5}],lastFixAt:now-60000};
  await executeTask({data:{locations:Array.from({length:30},(_,i)=>location({timestamp:now-58000+i*2000}))},error:null,executionInfo:{eventId:'rest',taskName:'ghovo-route-location',appState:'background'}} as never);
  expect(mockActive!.points).toHaveLength(1);expect(mockActive!.lastFixAt).toBe(now);expect(mockActive!.gpsGaps).toBe(0);
});
test('synchronous watcher failure releases its timeout immediately',async()=>{
  jest.mocked(Location.watchPositionAsync).mockImplementationOnce(()=>{throw Error('Permiso revocado');});
  await expect(getFreshFix(1000)).rejects.toThrow('Permiso revocado');expect(jest.getTimerCount()).toBe(0);
});
test('a watcher created after the timeout is removed as soon as it resolves',async()=>{
  let release!:(subscription:Location.LocationSubscription)=>void;
  jest.mocked(Location.watchPositionAsync).mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
  const pending=getFreshFix(1000),checked=expect(pending).rejects.toThrow('1 segundos');
  await jest.advanceTimersByTimeAsync(1001);await checked;
  release({remove:mockRemove});await Promise.resolve();expect(mockRemove).toHaveBeenCalledTimes(1);
});
test('foreground recovery restarts a stopped pending service with its driving cadence',async()=>{
  mockActive={...run(),mode:'driving'};
  await ensureTracking();
  expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith('ghovo-route-location',expect.objectContaining({timeInterval:1000,distanceInterval:0}));
  expect(mockActive!.mode).toBe('driving');
});
test('foreground recovery leaves an already running service alone',async()=>{
  mockActive=run();jest.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValueOnce(true);
  await ensureTracking();expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();expect(Location.stopLocationUpdatesAsync).not.toHaveBeenCalled();expect(speakNotice).not.toHaveBeenCalled();
});

test('background arrival saves exactly once after the full course and five seconds near the finish',async()=>{
  const now=Date.now(),startedAt=now-105000;
  const point=(meters:number,timestamp:number)=>({latitude:0,longitude:meters/6371000*180/Math.PI,timestamp,accuracy:5});
  const reference:Run={id:'reference',routeId:'commute',name:'Casa',mode:'driving',startedAt:now-400000,endedAt:now-300000,points:Array.from({length:101},(_,i)=>point(i*10,now-400000+i*1000)),gpsGaps:0};
  mockHistory=[reference];mockActive={id:'today',routeId:'commute',name:'Casa',mode:'driving',referenceId:reference.id,autoFinish:true,startedAt,points:[point(0,startedAt)],lastFixAt:startedAt};
  jest.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValueOnce(true);
  const locations=Array.from({length:105},(_,i)=>{const index=i+1,pt=point(Math.min(index*10,1000),startedAt+index*1000);return location({timestamp:pt.timestamp,coords:{...location().coords,latitude:pt.latitude,longitude:pt.longitude}});});
  await executeTask({data:{locations},error:null,executionInfo:{eventId:'arrival',taskName:'ghovo-route-location',appState:'background'}} as never);
  expect(mockActive).toBeNull();expect(mockHistory).toHaveLength(2);expect(mockResult).toBe('today');expect(mockHistory[1].autoCompleted).toBe(true);expect(mockHistory[1].comparison?.splits.at(-1)?.elapsed).toBe(mockHistory[1].endedAt!-(mockHistory[1].circuitStartedAt??startedAt));expect(Location.stopLocationUpdatesAsync).toHaveBeenCalled();
  await executeTask({data:{locations},error:null,executionInfo:{eventId:'duplicate',taskName:'ghovo-route-location',appState:'background'}} as never);expect(mockHistory).toHaveLength(2);expect(speakNotice).toHaveBeenCalledTimes(1);expect(speakNotice).toHaveBeenCalledWith(expect.objectContaining({kind:'arrival'}),true);
});

test('failed automatic save keeps the draft and does not stop GPS',async()=>{
  const now=Date.now(),startedAt=now-105000;
  const point=(meters:number,timestamp:number)=>({latitude:0,longitude:meters/6371000*180/Math.PI,timestamp,accuracy:5});
  const reference:Run={id:'reference',routeId:'commute',name:'Casa',mode:'driving',startedAt:now-400000,endedAt:now-300000,points:Array.from({length:101},(_,i)=>point(i*10,now-400000+i*1000)),gpsGaps:0};
  mockHistory=[reference];mockActive={id:'today',routeId:'commute',name:'Casa',mode:'driving',referenceId:reference.id,autoFinish:true,startedAt,points:[point(0,startedAt)],lastFixAt:startedAt};
  const draft=structuredClone(mockActive);
  const locations=Array.from({length:105},(_,i)=>{const index=i+1,pt=point(Math.min(index*10,1000),startedAt+index*1000);return location({timestamp:pt.timestamp,coords:{...location().coords,latitude:pt.latitude,longitude:pt.longitude}});});
  jest.mocked(writeMany).mockRejectedValueOnce(Error('Disco lleno'));
  await executeTask({data:{locations},error:null,executionInfo:{eventId:'failed-arrival',taskName:'ghovo-route-location',appState:'background'}} as never);
  expect(mockActive?.id).toBe(draft.id);expect(mockActive!.points.length).toBeGreaterThan(draft.points.length);expect(mockActive?.error).toMatch(/No se pudo guardar/);expect(mockHistory).toHaveLength(1);expect(Location.stopLocationUpdatesAsync).not.toHaveBeenCalled();expect(speakNotice).not.toHaveBeenCalled();
  await executeTask({data:{locations:[...locations,location({timestamp:now+1000,coords:{...location().coords,latitude:0,longitude:point(1000,now).longitude}})]},error:null,executionInfo:{eventId:'retry-arrival',taskName:'ghovo-route-location',appState:'background'}} as never);
  expect(mockActive).toBeNull();expect(mockHistory).toHaveLength(2);expect(mockHistory[1].error).toBeUndefined();
});

test('arrival still saves after a route deviation, without claiming a comparable finish time',async()=>{
 const now=Date.now(),startedAt=now-105000;const point=(meters:number,timestamp:number,north=0)=>({latitude:north/111195,longitude:meters/111195,timestamp,accuracy:5});
 const reference:Run={id:'reference',routeId:'commute',name:'Casa',mode:'driving',startedAt:now-400000,endedAt:now-300000,points:Array.from({length:101},(_,i)=>point(i*10,now-400000+i*1000))};
 mockHistory=[reference];mockActive={id:'deviation',routeId:'commute',name:'Casa',mode:'driving',referenceId:reference.id,autoFinish:true,startedAt,points:Array.from({length:101},(_,i)=>point(i*10,startedAt+i*1000,i===50?100:0)),lastFixAt:now-5000,comparison:{progress:1000,segment:99,lastFixAt:now-5000,lastMatchedAt:now-5000,unavailable:false,difference:0,splits:[],arrivalSince:now-5000,arrivalAnchor:point(1000,now-5000)}};
 const end=point(1000,now);await executeTask({data:{locations:[location({timestamp:now,coords:{...location().coords,latitude:end.latitude,longitude:end.longitude}})]},error:null,executionInfo:{eventId:'deviation-arrival',taskName:'ghovo-route-location',appState:'background'}} as never);
 expect(mockActive).toBeNull();expect(mockHistory[1].incomplete).toBe(true);expect(mockHistory[1].autoCompleted).toBe(true);expect(mockHistory[1].comparison?.difference).toBeNull();expect(mockHistory[1].notice?.message).toMatch(/Sin comparación/);
});

test('parking in the destination area 120 m from B saves automatically without rejecting the endpoint mismatch',async()=>{
 const now=Date.now(),startedAt=now-110000;const point=(m:number,t:number,n=0)=>({latitude:n/111195,longitude:m/111195,timestamp:t,accuracy:8});
 const reference:Run={id:'reference',routeId:'commute',name:'Casa',mode:'driving',startedAt:now-500000,endedAt:now-400000,points:Array.from({length:101},(_,i)=>point(i*10,now-500000+i*1000))};const parked=point(1000,now-5000,120);
 mockHistory=[reference];mockActive={id:'parking',routeId:'commute',name:'Casa',mode:'driving',referenceId:reference.id,autoFinish:true,startedAt,points:[...Array.from({length:101},(_,i)=>point(i*10,startedAt+i*1000)),parked],lastFixAt:parked.timestamp,comparison:{progress:1000,segment:99,lastFixAt:parked.timestamp,lastMatchedAt:parked.timestamp,unavailable:false,difference:0,splits:[],arrivalSince:parked.timestamp,arrivalAnchor:parked}};
 await executeTask({data:{locations:[location({timestamp:now,coords:{...location().coords,latitude:parked.latitude,longitude:parked.longitude,accuracy:8,speed:0}})]},error:null,executionInfo:{eventId:'area-arrival',taskName:'ghovo-route-location',appState:'background'}} as never);
 expect(mockActive).toBeNull();expect(mockHistory).toHaveLength(2);expect(mockHistory[1].autoCompleted).toBe(true);
 // Aparcar 120 m al lado de B ya no invalida el intento: se recorta la cola de aparcamiento.
 expect(mockHistory[1].incomplete).toBe(false);
});

test('checkpoint speech is emitted after saving and duplicate GPS batches do not repeat it',async()=>{
  const startedAt=Date.now();
  const point=(meters:number,timestamp:number)=>({latitude:0,longitude:meters/6371000*180/Math.PI,timestamp,accuracy:5});
  const reference:Run={id:'ref-checkpoint',routeId:'commute',name:'Casa',mode:'driving',startedAt:startedAt-1000000,endedAt:startedAt-500000,points:Array.from({length:501},(_,i)=>point(i*10,startedAt-1000000+i*1000)),gpsGaps:0};
  mockHistory=[reference];mockActive={id:'today-checkpoint',routeId:'commute',name:'Casa',mode:'driving',referenceId:reference.id,checkpointKm:2,voiceEnabled:true,autoFinish:false,startedAt,points:[point(0,startedAt)],lastFixAt:startedAt};
  const locations=Array.from({length:200},(_,i)=>{const index=i+1,pt=point(index*10,startedAt+index*1000);return location({timestamp:pt.timestamp,coords:{...location().coords,latitude:pt.latitude,longitude:pt.longitude}});});
  jest.setSystemTime(startedAt+200000);
  const task={data:{locations},error:null,executionInfo:{eventId:'control',taskName:'ghovo-route-location',appState:'background'}} as never;
  await executeTask(task);expect(mockActive?.notice?.title).toBe('Control · Km 2');expect(speakNotice).toHaveBeenCalledTimes(1);
  await executeTask(task);expect(speakNotice).toHaveBeenCalledTimes(1);
});

test('GPS disabled prevents native start and never creates a draft',async()=>{
  jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValueOnce(false);
  await expect(startTracking(run())).rejects.toThrow('Activa la ubicación');
  expect(mockActive).toBeNull();expect(Location.watchPositionAsync).not.toHaveBeenCalled();
  expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
});

test('losing the signal after confirmation cannot create a route from a cached position',async()=>{
  const pending=startTracking(run());const checked=expect(pending).rejects.toThrow('No se obtuvo una señal GPS precisa');
  await jest.advanceTimersByTimeAsync(1);
  mockFix!(location({timestamp:Date.now()-60000}));
  mockFix!(location({coords:{...location().coords,accuracy:100}}));
  await jest.advanceTimersByTimeAsync(25001);await checked;
  expect(mockActive).toBeNull();expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
});

test('native GPS error during confirmation rejects the start without saving',async()=>{
  let fail!:(reason:string)=>void;
  jest.mocked(Location.watchPositionAsync).mockImplementationOnce(async(_options,callback,errorHandler)=>{mockFix=callback;fail=errorHandler!;return {remove:mockRemove};});
  const pending=startTracking(run());const checked=expect(pending).rejects.toThrow('El servicio GPS ha fallado');
  await jest.advanceTimersByTimeAsync(1);fail('disabled');await checked;
  expect(mockActive).toBeNull();expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();expect(mockRemove).toHaveBeenCalled();
});

test('switching GPS off while acquiring the first fix never creates a recording',async()=>{
  jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  const pending=startTracking(run());const checked=expect(pending).rejects.toThrow('No se ha iniciado la ruta');
  await jest.advanceTimersByTimeAsync(1);[-2000,-1000,0].forEach(offset=>mockFix!(location({timestamp:Date.now()+offset})));await checked;
  expect(mockActive).toBeNull();expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();
});

test('automatic recovery preserves points, restarts a stale service, and backs off',async()=>{
  mockActive={...run(),id:'auto-recovery-1',startedAt:Date.now()-60000,lastFixAt:Date.now()-60000,points:[{latitude:40,longitude:-3,timestamp:Date.now()-60000,accuracy:5}],mode:'driving'};
  const points=mockActive.points;
  jest.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(true);
  await recoverTracking();
  expect(Location.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  expect(Location.startLocationUpdatesAsync).toHaveBeenCalledWith('ghovo-route-location',expect.objectContaining({timeInterval:1000}));
  expect(mockActive.points).toBe(points);expect(mockActive.error).toContain('Esperando una posición precisa');
  await recoverTracking();expect(Location.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(30001);await recoverTracking();expect(Location.startLocationUpdatesAsync).toHaveBeenCalledTimes(2);
  await jest.advanceTimersByTimeAsync(60001);await recoverTracking();expect(Location.startLocationUpdatesAsync).toHaveBeenCalledTimes(3);
  await jest.advanceTimersByTimeAsync(120001);await recoverTracking();expect(Location.startLocationUpdatesAsync).toHaveBeenCalledTimes(3);
  jest.mocked(Location.hasStartedLocationUpdatesAsync).mockResolvedValue(false);
});

test('automatic recovery never requests permissions or discards the route when GPS is off',async()=>{
  mockActive={...run(),id:'auto-recovery-2',startedAt:Date.now()-60000,lastFixAt:Date.now()-60000};
  jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValueOnce(false);
  await recoverTracking();
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  expect(Location.startLocationUpdatesAsync).not.toHaveBeenCalled();expect(mockActive!.id).toBe('auto-recovery-2');
});

test('one precise fix or repeated timestamps never pass the recording start gate',async()=>{
  const pending=getFreshFix(3000);const checked=expect(pending).rejects.toThrow('No se obtuvo');
  await Promise.resolve();mockFix!(location());mockFix!(location());mockFix!(location());
  await jest.advanceTimersByTimeAsync(3001);await checked;
});

test('cruzar la línea de meta cierra la ruta sin necesidad de parar',async()=>{
  const now=Date.now(),startedAt=now-120000;
  const point=(m:number,t:number)=>({latitude:0,longitude:m/6371000*180/Math.PI,timestamp:t,accuracy:5});
  const reference:Run={id:'ref-line',routeId:'commute',name:'Casa',mode:'driving',startedAt:startedAt-1000000,endedAt:startedAt-500000,points:Array.from({length:101},(_,i)=>point(i*10,startedAt-1000000+i*1000)),gpsGaps:0};
  mockHistory=[reference];
  mockActive={id:'line',routeId:'commute',name:'Casa',mode:'driving',referenceId:reference.id,autoFinish:true,startedAt,circuitStartedAt:startedAt,points:Array.from({length:100},(_,i)=>point(i*10,startedAt+i*1000)),lastFixAt:startedAt+99000,
    comparison:{progress:990,segment:98,lastFixAt:startedAt+99000,lastMatchedAt:startedAt+99000,unavailable:false,difference:0,splits:[]}};
  // Cruza la meta a velocidad de carretera y sin frenar.
  await executeTask({data:{locations:[location({timestamp:startedAt+100000,coords:{...location().coords,latitude:0,longitude:1000/6371000*180/Math.PI,speed:11}})]},error:null,executionInfo:{eventId:'line-crossing',taskName:'ghovo-route-location',appState:'background'}} as never);
  expect(mockActive).toBeNull();
  expect(mockHistory).toHaveLength(2);
  expect(mockHistory[1].autoCompleted).toBe(true);
  expect(mockHistory[1].incomplete).toBe(false);
  expect(mockHistory[1].endedAt).toBe(startedAt+100000);
});
