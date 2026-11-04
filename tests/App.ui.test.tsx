import React from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { history, writeMany } from '../src/storage';
import App from '../App';
import type { Run } from '../src/core';
import {startTracking,stopTracking} from '../src/tracking';
import {exportRouteReport} from '../src/data-transfer';
jest.mock('../src/account-client',()=>{const state={status:'unavailable',user:null,recovery:false};return {accountConfigured:false,accountSnapshot:()=>state,subscribeAccount:()=>()=>{},initializeAccounts:jest.fn(async()=>{}),refreshAccount:jest.fn(async()=>{}),accountError:()=> 'No disponible'};});
jest.mock('../src/speech',()=>({speakNotice:jest.fn(async()=>true),stopVoice:jest.fn(async()=>{}),testVoice:jest.fn(async()=>true)}));


let mockGpsReady=true;
let mockGpsPoint:import('../src/core').Point|undefined;
let mockObservedPoint:import('../src/core').Point|undefined;
let mockPath='/';
const mockRouteListeners=new Set<()=>void>();
jest.mock('expo-router',()=>({
  usePathname:()=>{const React=require('react');return React.useSyncExternalStore((listener:()=>void)=>{mockRouteListeners.add(listener);return()=>mockRouteListeners.delete(listener);},()=>mockPath);},
  router:{replace:(path:string)=>{mockPath=path;mockRouteListeners.forEach(listener=>listener());},push:(path:string)=>{mockPath=path;mockRouteListeners.forEach(listener=>listener());},back:()=>{mockPath='/route';mockRouteListeners.forEach(listener=>listener());}},
}));
jest.mock('../src/useGpsPreparation',()=>({useGpsPreparation:()=>({ready:mockGpsReady,message:'Listo para empezar',retry:jest.fn(),point:mockGpsPoint,observedPoint:mockObservedPoint})}));

let mockState: Record<string, unknown>;
jest.mock('../src/storage', () => ({
  active: jest.fn(async () => mockState.active ?? null),
  history: jest.fn(async () => mockState.history ?? []),
  read: jest.fn(async (key, fallback) => mockState[key] ?? fallback),
  write: jest.fn(async (key, value) => { mockState[key] = value; }),
  writeMany: jest.fn(async values => { Object.assign(mockState, values); }),
  serial: jest.fn(async fn => fn()),
  recoverPreviousLibrary: jest.fn(async () => {}),
}));
jest.mock('../src/tracking', () => ({
  startTracking: jest.fn(async () => {}), stopTracking: jest.fn(async () => {}),
  resumeTracking: jest.fn(async () => {}), trackingRunning: jest.fn(async () => false),
  ensureTracking: jest.fn(async()=>{}), recoverTracking:jest.fn(async()=>{}),
}));
jest.mock('../src/data-transfer', () => ({
  exportRouteReport:jest.fn(async()=>{}),
  exportGpx: jest.fn(async () => {}), exportLibrary: jest.fn(async () => {}),
  pickBackup: jest.fn(async () => null), applyBackup: jest.fn(async () => ({ added: 0, skipped: 0 })),
}));
jest.mock('../src/RouteMap', () => ({RouteMap:()=>require('react').createElement(require('react-native').View,{testID:'route-map'})}));

const run: Run = {
  id: 'first', routeId: 'route', name: 'Paseo del río', startedAt: 1700000000000, endedAt: 1700000060000,
  points: Array.from({ length: 8 }, (_, i) => ({ latitude: 40 + i * 0.0001, longitude: -3, timestamp: 1700000000000 + i * 8000, accuracy: 5 })),
};
beforeEach(() => {
  mockGpsPoint=undefined;
  mockObservedPoint=undefined;
  mockGpsReady=true;mockPath='/';mockRouteListeners.clear();
  jest.useFakeTimers({ now: 1700001000000 });
  mockState = { active: null, history: [structuredClone(run)], routeDetails: {} };
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });
async function openApp() {
  await render(<App />);
  await act(async () => { await jest.advanceTimersByTimeAsync(1); });
  await userEvent.setup().press(await screen.findByRole('button',{name:'Nueva ruta'}));
  expect(await screen.findByRole('button', { name: 'Empezar ruta' })).toBeEnabled();
}
async function openRoute(section:'settings'|'playback'|'summary'='settings') {
  await openApp();
  const user = userEvent.setup();
  await user.press(screen.getByRole('tab', { name: /Mis rutas/ }));
  await user.press(screen.getByText(/Paseo del río/));
  if(section!=='summary')await user.press(screen.getByRole('button',{name:section==='settings'?'Ajustes':'Viajes'}));
  if(section==='playback'){await user.press(screen.getByRole('button',{name:'Reproducir recorrido'}));await user.press(screen.getByRole('button',{name:'Ajustes de reproducción'}));}
  return user;
}
test('mode selected in the fixed start controls is used for the new recording',async()=>{
  await openApp();const user=userEvent.setup();
  await user.press(screen.getByRole('button',{name:'A pie'}));
  expect(screen.getByRole('button',{name:'A pie'}).props.accessibilityState.selected).toBe(true);
  await user.press(screen.getByRole('button',{name:'Empezar ruta'}));
  await act(async()=>{jest.mocked(Alert.alert).mock.calls.at(-1)![2]!.find(button=>button.text==='Estoy parado · iniciar')!.onPress!();});
  await waitFor(()=>expect(startTracking).toHaveBeenCalledWith(expect.objectContaining({mode:'walking',name:'Mi ruta'}),undefined));
});
test('library search handles accents and favorite empty state', async () => {
  await openApp();
  const user = userEvent.setup();
  await user.press(screen.getByRole('tab', { name: /Mis rutas/ }));
  await user.type(screen.getByLabelText('Buscar rutas por nombre'), 'rio');
  expect(screen.getByText('Paseo del río')).toBeOnTheScreen();
  await user.press(screen.getByRole('button', {name:'Filtros de rutas'}));
  await user.press(screen.getByRole('checkbox'));
  expect(screen.getByText(/No hay favoritas que coincidan/)).toBeOnTheScreen();
});
test('favorite and note edits persist without modifying recorded coordinates', async () => {
  const user = await openRoute();
  await user.press(screen.getByRole('button', { name: '☆ Añadir a favoritas' }));
  expect(await screen.findByRole('button', { name: '★ Quitar de favoritas' })).toBeEnabled();
  await user.press(screen.getByRole('button', { name: 'Añadir notas' }));
  await user.type(screen.getByLabelText('Notas personales del recorrido'), 'Cruzar por el puente');
  await user.press(screen.getByRole('button', { name: 'Guardar notas' }));
  expect(await screen.findByText('Cruzar por el puente')).toBeOnTheScreen();
  expect(mockState.routeDetails).toEqual({ route: { favorite: true, note: 'Cruzar por el puente' } });
  expect((mockState.history as Run[])[0].points).toEqual(run.points);
});

test('route information expands below quick actions and leaves the saved route unchanged',async()=>{
  const original=structuredClone(mockState.history);
  const user=await openRoute('summary');
  const information=screen.getByRole('button',{name:'Información de la ruta'});
  expect(information.props.accessibilityState.expanded).toBe(false);
  expect(screen.queryByText('Tu historial en esta ruta')).not.toBeOnTheScreen();
  await user.press(information);
  expect(screen.getByText('Tu historial en esta ruta')).toBeOnTheScreen();
  for(const label of ['Tiempo habitual','Mejor tiempo guardado','Viajes completados','Distancia acumulada','Primer viaje guardado','Última salida guardada'])expect(screen.getByText(label)).toBeOnTheScreen();
  expect(screen.getByRole('button',{name:'Ver mapa de la ruta'})).toBeEnabled();
  expect(screen.getByRole('button',{name:'Viajes'})).toBeEnabled();
  await user.press(information);
  expect(screen.queryByText('Tu historial en esta ruta')).not.toBeOnTheScreen();
  expect(mockState.history).toEqual(original);expect(startTracking).not.toHaveBeenCalled();
});

test('premium analysis has its own route and can return without starting GPS recording',async()=>{
  const original=structuredClone(mockState.history),user=await openRoute('summary');
  await user.press(screen.getByRole('button',{name:'Análisis premium'}));
  expect(mockPath).toBe('/insights');
  expect(screen.getByText('Análisis de ruta')).toBeOnTheScreen();
  await user.press(screen.getByRole('button',{name:'← Volver a la ruta'}));
  expect(mockPath).toBe('/route');
  expect(screen.getByRole('button',{name:'Ver mapa de la ruta'})).toBeEnabled();
  expect(mockState.history).toEqual(original);expect(startTracking).not.toHaveBeenCalled();
});
test('premium report waits for the users sharing choice and does not change saved trips',async()=>{
  const original=structuredClone(mockState.history),user=await openRoute('summary');
  await user.press(screen.getByRole('button',{name:'Análisis premium'}));
  await user.press(screen.getByRole('button',{name:'Exportar informe CSV del periodo'}));
  expect(exportRouteReport).not.toHaveBeenCalled();
  expect(Alert.alert).toHaveBeenLastCalledWith('Exportar informe',expect.stringContaining('sin coordenadas GPS'),expect.any(Array));
  await act(async()=>{jest.mocked(Alert.alert).mock.calls.at(-1)![2]!.find(button=>button.text==='Continuar')!.onPress!();});
  await waitFor(()=>expect(exportRouteReport).toHaveBeenCalledWith(expect.objectContaining({routeId:'route'}),expect.arrayContaining([expect.objectContaining({id:'first'})])));
  expect(mockState.history).toEqual(original);
});

test('favorites have their own Home section, appear once, and can be removed from route detail',async()=>{
  const user=await openRoute('summary');
  await user.press(screen.getByRole('button',{name:'☆ Añadir a favoritas'}));
  await user.press(screen.getByRole('tab',{name:'Inicio'}));
  expect(screen.getByText('Favoritas')).toBeOnTheScreen();
  expect(screen.getAllByText('Paseo del río')).toHaveLength(1);
  expect(screen.getByRole('button',{name:'Iniciar Paseo del río'})).toBeEnabled();
  await user.press(screen.getByRole('button',{name:'Ver Paseo del río'}));
  await user.press(screen.getByRole('button',{name:'★ Quitar de favoritas'}));
  await user.press(screen.getByRole('tab',{name:'Inicio'}));
  expect(screen.queryByText('Favoritas')).not.toBeOnTheScreen();
  expect(screen.getByText('Tus rutas habituales')).toBeOnTheScreen();
  expect((mockState.history as Run[])[0].points).toEqual(run.points);
});

test('every saved trip opens its information without changing the recording',async()=>{
  const second={...structuredClone(run),id:'second',startedAt:run.startedAt+100000,endedAt:run.startedAt+180000,points:run.points.map(point=>({...point,timestamp:point.timestamp+100000}))};
  mockState.history=[structuredClone(run),second];
  const original=structuredClone(mockState.history);
  const user=await openRoute('summary');
  await user.press(screen.getByRole('button',{name:'Viajes'}));
  const details=screen.getAllByRole('button',{name:/Ver detalles del viaje/});
  expect(details).toHaveLength(2);
  await user.press(details[1]);
  expect(screen.getByText('Información del viaje')).toBeOnTheScreen();
  for(const label of ['Salida','Llegada','Velocidad media','Modo de viaje','Precisión GPS estimada','Interrupciones GPS'])expect(screen.getByText(label)).toBeOnTheScreen();
  expect(screen.getByText(/El tiempo total y la velocidad media incluyen las paradas/)).toBeOnTheScreen();
  expect(mockState.history).toEqual(original);
  expect(startTracking).not.toHaveBeenCalled();
});
test('replay controls pause, seek and restart without changing original time', async () => {
  const user = await openRoute('playback');
  await user.press(screen.getByRole('button', { name: 'Reproducir fantasma' }));
  await act(async () => { await jest.advanceTimersByTimeAsync(3000); });
  await user.press(screen.getByRole('button', { name: 'Pausar fantasma' }));
  const timeline = screen.getByLabelText('Posición del fantasma');
  const value = timeline.props.accessibilityValue.now;
  await act(async () => { await jest.advanceTimersByTimeAsync(5000); });
  expect(screen.getByLabelText('Posición del fantasma')).toHaveAccessibilityValue({ now: value });
  await user.press(screen.getByRole('button', { name: '+10 segundos' }));
  expect(screen.getByLabelText('Posición del fantasma').props.accessibilityValue.now).toBeGreaterThan(value);
  await user.press(screen.getByRole('button', { name: 'Reiniciar desde A' }));
  expect(screen.getByLabelText('Posición del fantasma')).toHaveAccessibilityValue({ now: 0 });
  expect((mockState.history as Run[])[0].endedAt).toBe(run.endedAt);
});
test('canceling a route deletion leaves the library intact', async () => {
  const user = await openRoute();
  await user.press(screen.getByRole('button', { name: 'Eliminar ruta y sus intentos' }));
  expect(Alert.alert).toHaveBeenCalledWith('Eliminar ruta', expect.any(String), expect.any(Array));
  expect((mockState.history as Run[]).length).toBe(1);
});
test('cold start restores an unfinished run without starting another', async () => {
  mockState.active = { ...run, id: 'pending', endedAt: undefined };
  await render(<App />);
  await act(async () => { await jest.advanceTimersByTimeAsync(1); });
  expect(await screen.findByRole('button', { name: 'Finalizar ruta' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Empezar ruta' })).not.toBeOnTheScreen();
  expect(screen.getByText(/servicio GPS está detenido/)).toBeOnTheScreen();
});
test('renaming a route changes every attempt but preserves note metadata', async () => {
  mockState.history = [structuredClone(run), { ...structuredClone(run), id: 'second', startedAt: run.startedAt + 100000, endedAt: run.endedAt! + 100000 }];
  mockState.routeDetails = { route: { favorite: true, note: 'Conservar' } };
  const user = await openRoute();
  await user.press(screen.getByRole('button', { name: 'Cambiar nombre de la ruta' }));
  await user.clear(screen.getByLabelText('Nuevo nombre de la ruta'));
  await user.type(screen.getByLabelText('Nuevo nombre de la ruta'), 'Parque');
  await user.press(screen.getByRole('button', { name: 'Guardar nombre' }));
  await waitFor(() => expect((mockState.history as Run[]).map(r => r.name)).toEqual(['Parque', 'Parque']));
  expect(mockState.routeDetails).toEqual({ route: { favorite: true, note: 'Conservar' } });
});
test('finishing a valid run saves it with its result and clears the draft',async()=>{
  const now=Date.now();
  mockState.active={...run,id:'pending',startedAt:now-56000,endedAt:undefined,points:run.points.map((p,i)=>({...p,timestamp:now-56000+i*8000})),lastFixAt:now,gpsGaps:0};
  await render(<App/>);
  await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  const user=userEvent.setup();
  await user.press(await screen.findByRole('button',{name:'Finalizar ruta'}));
  expect(await screen.findByText('RUTA GUARDADA')).toBeOnTheScreen();
  expect(mockState.active).toBeNull();expect(mockState.lastResult).toBe('pending');
  expect((mockState.history as Run[]).length).toBe(2);
});
test('failed final commit leaves the unfinished run intact for recovery',async()=>{
  const now=Date.now();
  mockState.active={...run,id:'pending',startedAt:now-56000,endedAt:undefined,points:run.points.map((p,i)=>({...p,timestamp:now-56000+i*8000})),lastFixAt:now,gpsGaps:0};
  jest.mocked(writeMany).mockRejectedValueOnce(Error('Disco lleno'));
  await render(<App/>);
  await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  const user=userEvent.setup();
  await user.press(await screen.findByRole('button',{name:'Finalizar ruta'}));
  await waitFor(()=>expect(Alert.alert).toHaveBeenCalledWith('GHOVO','Disco lleno'));
  expect((mockState.active as Run).endedAt).toBeUndefined();
  expect(stopTracking).not.toHaveBeenCalled();
  expect((mockState.history as Run[]).length).toBe(1);
});
test('manual finish outside the endpoint radius saves a partial route instead of rejecting A-B mismatch',async()=>{
 const now=Date.now();mockState.active={...run,id:'partial',startedAt:now-56000,endedAt:undefined,points:run.points.map((p,i)=>({...p,latitude:p.latitude+0.002,timestamp:now-56000+i*8000})),lastFixAt:now};
 await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});await userEvent.setup().press(await screen.findByRole('button',{name:'Finalizar ruta'}));
 expect(await screen.findByText('RUTA GUARDADA')).toBeOnTheScreen();expect(mockState.active).toBeNull();expect((mockState.history as Run[]).find(item=>item.id==='partial')?.incomplete).toBe(true);expect((mockState.history as Run[]).find(item=>item.id==='first')?.incomplete).toBeUndefined();expect(stopTracking).toHaveBeenCalledTimes(1);
});

test('a native stop error after commit cannot turn a saved recording into a failed save',async()=>{
 const now=Date.now();mockState.active={...run,id:'saved',startedAt:now-56000,endedAt:undefined,points:run.points.map((p,i)=>({...p,timestamp:now-56000+i*8000})),lastFixAt:now};jest.mocked(stopTracking).mockRejectedValueOnce(Error('Servicio ya detenido'));
 await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});await userEvent.setup().press(await screen.findByRole('button',{name:'Finalizar ruta'}));expect(await screen.findByText('RUTA GUARDADA')).toBeOnTheScreen();expect(mockState.active).toBeNull();expect(mockState.lastResult).toBe('saved');
});

test('canceling a note edit does not alter saved notes',async()=>{
  mockState.routeDetails={route:{favorite:false,note:'Original'}};
  const user=await openRoute();
  await user.press(screen.getByRole('button',{name:'Editar notas'}));
  await user.clear(screen.getByLabelText('Notas personales del recorrido'));
  await user.type(screen.getByLabelText('Notas personales del recorrido'),'Borrador');
  await user.press(screen.getByRole('button',{name:'Cancelar'}));
  expect(screen.getByText('Original')).toBeOnTheScreen();
  expect(mockState.routeDetails).toEqual({route:{favorite:false,note:'Original'}});
});
test('failed favorite save cannot mutate the cached metadata',async()=>{
  const original={route:{favorite:false,note:'Conservar'}};
  mockState.routeDetails=original;
  const user=await openRoute();
  jest.mocked(writeMany).mockRejectedValueOnce(Error('No hay espacio'));
  await user.press(screen.getByRole('button',{name:'☆ Añadir a favoritas'}));
  await waitFor(()=>expect(Alert.alert).toHaveBeenCalledWith('GHOVO','No hay espacio'));
  expect(original.route.favorite).toBe(false);expect(mockState.routeDetails).toBe(original);
  expect(screen.getByRole('button',{name:'☆ Añadir a favoritas'})).toBeOnTheScreen();
});
test('failed deletion cannot remove a note from cached metadata',async()=>{
  const original={route:{favorite:true,note:'Conservar'}};mockState.routeDetails=original;
  const user=await openRoute();jest.mocked(writeMany).mockRejectedValueOnce(Error('Fallo de disco'));
  await user.press(screen.getByRole('button',{name:'Eliminar ruta y sus intentos'}));
  await act(async()=>{jest.mocked(Alert.alert).mock.calls.at(-1)![2]!.find(action=>action.text==='Eliminar')!.onPress!();});
  await waitFor(()=>expect(Alert.alert).toHaveBeenLastCalledWith('GHOVO','Fallo de disco'));
  expect(original.route.note).toBe('Conservar');expect(mockState.routeDetails).toBe(original);
  expect(mockState.history).toHaveLength(1);
});
test('backgrounding stops UI polling and freezes replay until the app is reopened',async()=>{
  let onState!:(state:AppStateStatus)=>void;
  jest.spyOn(AppState,'addEventListener').mockImplementation((_event,listener)=>{onState=listener;return {remove:jest.fn()};});
  const user=await openRoute('playback');
  await user.press(screen.getByRole('button',{name:'Reproducir fantasma'}));
  await act(async()=>{await jest.advanceTimersByTimeAsync(3000);onState('background');});
  const before=screen.getByLabelText('Posición del fantasma').props.accessibilityValue.now;
  jest.mocked(history).mockClear();
  await act(async()=>{await jest.advanceTimersByTimeAsync(15000);});
  expect(history).not.toHaveBeenCalled();expect(screen.getByLabelText('Posición del fantasma')).toHaveAccessibilityValue({now:before});
  await act(async()=>{onState('active');await jest.advanceTimersByTimeAsync(1);});
  expect(history).toHaveBeenCalled();expect(screen.getByRole('button',{name:'Continuar reproducción'})).toBeOnTheScreen();
});
test('screen timeout can be restored without stopping or discarding the current recording',async()=>{
  mockState.active={...run,id:'pending',endedAt:undefined};
  await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  const toggle=await screen.findByRole('switch',{name:'Mantener pantalla encendida'});
  expect(toggle.props.accessibilityState.checked).toBe(true);
  await userEvent.setup().press(toggle);
  expect(screen.getByRole('switch',{name:'Mantener pantalla encendida'}).props.accessibilityState.checked).toBe(false);
  expect(stopTracking).not.toHaveBeenCalled();expect((mockState.active as Run).id).toBe('pending');
});


test('launch opens Home even when the previous saved result exists',async()=>{
  mockState.lastResult=run.id;
  await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  expect(await screen.findByRole('button',{name:'Nueva ruta'})).toBeEnabled();
  expect(screen.queryByText('RUTA GUARDADA')).not.toBeOnTheScreen();
  expect(screen.queryByRole('button',{name:'Empezar ruta'})).not.toBeOnTheScreen();
});
test('new recording cannot start before GPS preparation succeeds',async()=>{
  mockGpsReady=false;
  await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  await userEvent.setup().press(await screen.findByRole('button',{name:'Nueva ruta'}));
  const start=screen.getByRole('button',{name:'Empezar ruta'});expect(start).toBeDisabled();
  await userEvent.setup().press(start);expect(startTracking).not.toHaveBeenCalled();
});
test('interrupted recording is offered for explicit recovery and never replaced by Home',async()=>{
  mockState.active={...run,id:'pending',endedAt:undefined};
  await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  expect(await screen.findByText('Tienes un recorrido sin terminar')).toBeOnTheScreen();
  expect(screen.getByRole('button',{name:'Continuar recorrido'})).toBeEnabled();
  expect(screen.queryByRole('button',{name:'Nueva ruta'})).not.toBeOnTheScreen();
  expect((mockState.active as Run).id).toBe('pending');
});
test('car results use neutral wording without praising faster travel',async()=>{
  const now=Date.now();
  mockState.active={...run,id:'car',mode:'driving',startedAt:now-56000,endedAt:undefined,points:run.points.map((point,i)=>({...point,timestamp:now-56000+i*8000})),lastFixAt:now,gpsGaps:0};
  await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  await userEvent.setup().press(await screen.findByRole('button',{name:'Finalizar ruta'}));
  expect(await screen.findByText('Felicidades, has llegado')).toBeOnTheScreen();
  expect(screen.queryByText(/Nueva mejor huella/)).not.toBeOnTheScreen();
  expect(screen.getByRole('button',{name:'Ver recorrido'})).toBeEnabled();
  await userEvent.setup().press(screen.getByRole('button',{name:'Volver a Inicio'}));
  expect(await screen.findByRole('button',{name:'Nueva ruta'})).toBeEnabled();
});

test('checkpoint interval can be edited and saved without changing route points',async()=>{
  const user=await openRoute();const original=structuredClone((mockState.history as Run[])[0].points);
  await user.press(screen.getByRole('button',{name:'Editar puntos de control'}));
  await user.press(screen.getByRole('radio',{name:'5 km'}));
  await waitFor(()=>expect((mockState.routeDetails as Record<string,{checkpointKm:number}>).route.checkpointKm).toBe(5));
  expect((mockState.history as Run[])[0].points).toEqual(original);
});

test('habitual route starts with a fixed last-trip reference from Home',async()=>{
  mockGpsPoint={...run.points[0],timestamp:Date.now()};
  mockState.history=[{...run,mode:'driving'}];
  await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  await userEvent.setup().press(await screen.findByRole('button',{name:'Iniciar Paseo del río'}));
  await act(async()=>{jest.mocked(Alert.alert).mock.calls.at(-1)![2]!.find(button=>button.text==='Estoy parado · iniciar')!.onPress!();});
  await waitFor(()=>expect(startTracking).toHaveBeenCalledWith(expect.objectContaining({referenceId:run.id,autoFinish:true,mode:'driving'}),undefined));
});
test('a habitual route starts recording immediately upon confirmation even off-road',async()=>{
 mockState.history=[{...run,mode:'driving'}];mockGpsPoint={...run.points[0],latitude:41};await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});await userEvent.setup().press(await screen.findByRole('button',{name:'Iniciar Paseo del río'}));await act(async()=>{jest.mocked(Alert.alert).mock.calls.at(-1)![2]!.find(button=>button.text==='Estoy parado · iniciar')!.onPress!();});
 await waitFor(()=>expect(startTracking).toHaveBeenCalledWith(expect.objectContaining({referenceId:run.id,autoFinish:true,mode:'driving'}),undefined));
});

test('saving for later keeps all draft points and offers recovery from Home',async()=>{
 const draft={...run,id:'long-pending',endedAt:undefined};mockState.active=draft;
 await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});const user=userEvent.setup();await user.press(screen.getByRole('button',{name:'Guardar el recorrido para continuarlo más tarde'}));await act(async()=>{jest.mocked(Alert.alert).mock.calls.at(-1)![2]!.find(button=>button.text==='Sí, cancelar')!.onPress!();});
 await waitFor(()=>expect(mockState.active).toBeNull());expect((mockState.pendingRecordings as Run[])[0].points).toEqual(draft.points);await user.press(await screen.findByRole('button',{name:'Recuperar Paseo del río'}));await waitFor(()=>expect((mockState.active as Run).id).toBe('long-pending'));expect((mockState.active as Run).points).toEqual(draft.points);expect(mockState.pendingRecordings).toEqual([]);
});

test('starting a saved route from details launches recording immediately',async()=>{
 const points=Array.from({length:101},(_,i)=>({...run.points[0],latitude:40+i*.0001,timestamp:run.startedAt+i*1000}));mockState.history=[{...run,mode:'driving',points,endedAt:points.at(-1)!.timestamp}];
 await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});await userEvent.setup().press(await screen.findByRole('button',{name:'Iniciar Paseo del río'}));await act(async()=>{jest.mocked(Alert.alert).mock.calls.at(-1)![2]!.find(button=>button.text==='Estoy parado · iniciar')!.onPress!();});
 await waitFor(()=>expect(startTracking).toHaveBeenCalledWith(expect.objectContaining({referenceId:run.id,mode:'driving'}),undefined));
});

test('manual save returns the result even when the native GPS stop never settles',async()=>{
 const now=Date.now();mockState.active={...run,id:'never-stop',startedAt:now-56000,endedAt:undefined,points:run.points.map((p,i)=>({...p,timestamp:now-56000+i*8000})),lastFixAt:now};jest.mocked(stopTracking).mockImplementationOnce(()=>new Promise(()=>{}));
 await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});await userEvent.setup().press(await screen.findByRole('button',{name:'Finalizar ruta'}));expect(await screen.findByText('RUTA GUARDADA')).toBeOnTheScreen();expect(mockState.active).toBeNull();
});

test('reference settings persist best choice and automatic arrival toggle',async()=>{
  mockState.history=[{...run,mode:'driving'}];
  const user=await openRoute();
  await user.press(screen.getByRole('radio',{name:'Mejor tiempo'}));
  await waitFor(()=>expect((mockState.routeDetails as Record<string,{referenceChoice:string}>).route.referenceChoice).toBe('best'));
  await user.press(screen.getByRole('switch',{name:'Guardar automáticamente al llegar'}));
  await waitFor(()=>expect((mockState.routeDetails as Record<string,{autoFinish:boolean}>).route.autoFinish).toBe(false));
});

test('voice preference is editable before starting a trip',async()=>{
  const user=await openRoute();
  await user.press(screen.getByRole('switch',{name:'Avisos de voz en puntos de control'}));
  await waitFor(()=>expect((mockState.routeDetails as Record<string,{voiceEnabled:boolean}>).route.voiceEnabled).toBe(false));
});

test('new route name remains editable while GPS is unavailable and never starts recording',async()=>{
  mockGpsReady=false;
  await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  const user=userEvent.setup();await user.press(screen.getByRole('button',{name:'Nueva ruta'}));
  const input=screen.getByLabelText('Nombre de la ruta');
  await user.clear(input);await user.type(input,'Casa al trabajo');
  expect(screen.getByLabelText('Nombre de la ruta').props.value).toBe('Casa al trabajo');
  expect(screen.getByRole('button',{name:'Empezar ruta'})).toBeDisabled();
  await act(async()=>{await jest.advanceTimersByTimeAsync(22000);});
  expect(screen.getByLabelText('Nombre de la ruta').props.value).toBe('Casa al trabajo');
  expect(startTracking).not.toHaveBeenCalled();
  await user.press(screen.getByRole('tab',{name:/Inicio/}));
  expect(screen.getByText('Ubicación actual')).toBeOnTheScreen();
});

test('tapping the GHOVO header returns from new route to Home',async()=>{
  await openApp();await userEvent.setup().press(screen.getByRole('button',{name:'GHOVO · Ir a Inicio'}));
  expect(screen.getByText('Ubicación actual')).toBeOnTheScreen();
  expect(screen.getByRole('button',{name:'Nueva ruta'})).toBeOnTheScreen();
  expect(startTracking).not.toHaveBeenCalled();
});

test('the header opens Home during recording without stopping it and offers a return',async()=>{
  mockState.active={...run,id:'pending',endedAt:undefined};
  await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  const user=userEvent.setup();await user.press(screen.getByRole('button',{name:'GHOVO · Ir a Inicio'}));
  expect(screen.getByText('Ubicación actual')).toBeOnTheScreen();
  expect(screen.queryByRole('button',{name:'Nueva ruta'})).not.toBeOnTheScreen();
  expect((mockState.active as Run).id).toBe('pending');expect(stopTracking).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button',{name:'Volver a mi ruta'}));
  expect(screen.getByRole('button',{name:'Finalizar ruta'})).toBeOnTheScreen();
  expect((mockState.active as Run).id).toBe('pending');expect(stopTracking).not.toHaveBeenCalled();
});

test('saved route details give options the full space and show the map only on request',async()=>{
  await openRoute('summary');const user=userEvent.setup();
  expect(screen.queryByTestId('route-map')).not.toBeOnTheScreen();
  expect(screen.getByRole('button',{name:'Iniciar sin comparación'})).toBeOnTheScreen();
  await user.press(screen.getByRole('button',{name:'Ver mapa de la ruta'}));
  expect(screen.getByTestId('route-map')).toBeOnTheScreen();
  await user.press(screen.getByRole('button',{name:'Cerrar mapa'}));
  expect(screen.queryByTestId('route-map')).not.toBeOnTheScreen();
});

test('GPS status can always be opened from Home without a GPS fix',async()=>{
  mockGpsReady=false;
  await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  await userEvent.setup().press(screen.getByRole('button',{name:/Consultar señal GPS/}));
  expect(screen.getByText('Estado del GPS')).toBeOnTheScreen();
  expect(screen.getByRole('button',{name:'Reintentar ubicación'})).toBeEnabled();
  expect(screen.getByRole('button',{name:'Ver diagnóstico GPS'})).toBeEnabled();
  expect(startTracking).not.toHaveBeenCalled();
});

test('Credits navigation is available without changing saved routes or starting GPS recording',async()=>{
  await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  const original=structuredClone(mockState.history),user=userEvent.setup();await user.press(screen.getByRole('tab',{name:'Cuenta'}));
  expect(screen.getByText('Saldo sin verificar')).toBeOnTheScreen();expect(screen.getByRole('tab',{name:'Cuenta'})).toBeSelected();
  await user.press(screen.getByRole('button',{name:'Pasar a Premium'}));expect(screen.getByText('Precio previsto: 4,99 €')).toBeOnTheScreen();
  await user.press(screen.getByRole('button',{name:'Volver a Inicio'}));expect(screen.getByRole('button',{name:'Nueva ruta'})).toBeOnTheScreen();expect(mockState.history).toEqual(original);
});
