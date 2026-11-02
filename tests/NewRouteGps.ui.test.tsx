import React from 'react';
import {Alert,AppState,type AppStateStatus} from 'react-native';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';

import App from '../App';
import RootLayout from '../src/app/_layout';
import * as Location from 'expo-location';
import {startTracking} from '../src/tracking';
jest.mock('../src/speech',()=>({speakNotice:jest.fn(async()=>true),stopVoice:jest.fn(async()=>{}),testVoice:jest.fn(async()=>true)}));
jest.mock('react-native-safe-area-context',()=>({SafeAreaView:require('react-native').View}));



let mockPath='/';
const mockRouteListeners=new Set<()=>void>();
jest.mock('expo-router',()=>({
  Slot:()=>require('react').createElement(require('../App').GhovoScreen),
  usePathname:()=>{const React=require('react');return React.useSyncExternalStore((listener:()=>void)=>{mockRouteListeners.add(listener);return()=>mockRouteListeners.delete(listener);},()=>mockPath);},
  router:{replace:(path:string)=>{mockPath=path;mockRouteListeners.forEach(listener=>listener());},push:(path:string)=>{mockPath=path;mockRouteListeners.forEach(listener=>listener());},back:()=>{mockPath='/route';mockRouteListeners.forEach(listener=>listener());}},
}));


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
  exportGpx: jest.fn(async () => {}), exportLibrary: jest.fn(async () => {}),
  pickBackup: jest.fn(async () => null), applyBackup: jest.fn(async () => ({ added: 0, skipped: 0 })),
}));
jest.mock('../src/RouteMap', () => ({ RouteMap: () => null }));


let mockFix:(location:Location.LocationObject)=>void;
const mockRemove=jest.fn();
jest.mock('expo-location',()=>({Accuracy:{High:4},
 getForegroundPermissionsAsync:jest.fn(async()=>({status:'granted',android:{accuracy:'fine'}})),
 requestForegroundPermissionsAsync:jest.fn(async()=>({status:'granted',android:{accuracy:'fine'}})),
 hasServicesEnabledAsync:jest.fn(async()=>true),
 watchPositionAsync:jest.fn(async(_options,callback)=>{mockFix=callback;return {remove:mockRemove};}),
}));
beforeEach(()=>{
 mockPath='/';mockRouteListeners.clear();jest.useFakeTimers({now:1700001000000});
 mockState={active:null,history:[],routeDetails:{}};
 jest.spyOn(Alert,'alert').mockImplementation(()=>{});
 jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({status:'granted',android:{accuracy:'fine'}} as Location.LocationPermissionResponse);
});

test('Android permission Activity lifecycle cannot repeatedly steal focus from the route name',async()=>{
 let onState!:(state:AppStateStatus)=>void;
 jest.spyOn(AppState,'addEventListener').mockImplementation((_event,listener)=>{onState=listener;return {remove:jest.fn()};});
 // Reproduce the native lifecycle: each permission request takes focus away.
 // The old unconditional request restarts this cycle every time GHOVO resumes.
 jest.mocked(Location.requestForegroundPermissionsAsync).mockImplementation(async()=>{
   onState('background');setTimeout(()=>onState('active'),50);
   return {status:'granted',android:{accuracy:'fine'}} as Location.LocationPermissionResponse;
 });
 await render(<RootLayout/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
 const user=userEvent.setup();await user.press(screen.getByRole('button',{name:'Nueva ruta'}));
 const field=screen.getByLabelText('Nombre de la ruta');
 await user.clear(field);await user.type(field,'Casa al trabajo');
 await act(async()=>{await jest.advanceTimersByTimeAsync(1000);});
 expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
 expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);
 expect(screen.getByLabelText('Nombre de la ruta')).toBe(field);
 expect(field.props.value).toBe('Casa al trabajo');
 await act(async()=>{[-2000,-1000,0].forEach(offset=>mockFix({...fix(),timestamp:Date.now()+offset}));});
 expect(screen.getByRole('button',{name:'Empezar ruta'})).toBeEnabled();
});
afterEach(()=>{jest.restoreAllMocks();jest.useRealTimers();});
const fix=()=>({timestamp:Date.now(),coords:{latitude:40,longitude:-3,accuracy:5},mocked:false} as Location.LocationObject);
test('real GPS preparation keeps new-route name editable, times out, retries, and enables only on a precise fix',async()=>{
 await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
 const user=userEvent.setup();await user.press(screen.getByRole('button',{name:'Nueva ruta'}));
 await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
 expect(screen.getByRole('button',{name:'Empezar ruta'})).toBeDisabled();
 await user.clear(screen.getByLabelText('Nombre de la ruta'));await user.type(screen.getByLabelText('Nombre de la ruta'),'Casa al trabajo');
 await act(async()=>{await jest.advanceTimersByTimeAsync(20001);});
 expect(screen.getByText(/No se obtuvo una posición precisa/)).toBeOnTheScreen();
 expect(screen.getByLabelText('Nombre de la ruta').props.value).toBe('Casa al trabajo');
 expect(mockRemove).toHaveBeenCalled();expect(startTracking).not.toHaveBeenCalled();
 const expired=mockFix;await act(async()=>{expired(fix());});
 expect(screen.getByRole('button',{name:'Empezar ruta'})).toBeDisabled();
 await user.press(screen.getByRole('button',{name:'Reintentar GPS'}));
 await act(async()=>{await jest.advanceTimersByTimeAsync(1);[-2000,-1000,0].forEach(offset=>mockFix({...fix(),timestamp:Date.now()+offset}));});
 expect(screen.getByRole('button',{name:'Empezar ruta'})).toBeEnabled();
 await user.press(screen.getByRole('button',{name:'Empezar ruta'}));
 await act(async()=>{jest.mocked(Alert.alert).mock.calls.at(-1)![2]!.find(button=>button.text==='Estoy parado · iniciar')!.onPress!();});
 await waitFor(()=>expect(startTracking).toHaveBeenCalledWith(expect.objectContaining({name:'Casa al trabajo',mode:'driving'}),undefined));
});
test('Home and new route share one location observer without starting recording',async()=>{
 await render(<App/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
 const user=userEvent.setup();await user.press(screen.getByRole('button',{name:'Nueva ruta'}));
 await act(async()=>{await jest.advanceTimersByTimeAsync(1);});const late=mockFix;
 await user.press(screen.getByRole('tab',{name:/Inicio/}));
 await act(async()=>{late(fix());});
 expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);expect(screen.getByText('¿Dónde vamos hoy?')).toBeOnTheScreen();
 expect(startTracking).not.toHaveBeenCalled();
});


test('root navigator renders one screen and GPS refresh does not recreate the name input',async()=>{
 await render(<RootLayout/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
 const user=userEvent.setup();await user.press(screen.getByRole('button',{name:'Nueva ruta'}));
 const field=screen.getByLabelText('Nombre de la ruta');
 await user.clear(field);await user.type(field,'Casa al trabajo');
 await act(async()=>{[-2000,-1000,0].forEach(offset=>mockFix({...fix(),timestamp:Date.now()+offset}));});
 expect(screen.getAllByLabelText('Nombre de la ruta')).toHaveLength(1);
 expect(screen.getByLabelText('Nombre de la ruta')).toBe(field);
 expect(field.props.value).toBe('Casa al trabajo');
 await act(async()=>{await jest.advanceTimersByTimeAsync(5000);});
 expect(screen.getByLabelText('Nombre de la ruta')).toBe(field);expect(field.props.value).toBe('Casa al trabajo');
});
