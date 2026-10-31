import React from 'react';
import {Text} from 'react-native';
import {act,render,screen} from '@testing-library/react-native';
import * as Location from 'expo-location';
import {useGpsPreparation} from '../src/useGpsPreparation';
jest.mock('expo-location',()=>({Accuracy:{High:4},getForegroundPermissionsAsync:jest.fn(),requestForegroundPermissionsAsync:jest.fn(),hasServicesEnabledAsync:jest.fn(),watchPositionAsync:jest.fn()}));
let fix:(location:Location.LocationObject)=>void;
const remove=jest.fn();
function Preparation({enabled=true,detect=false}:{enabled?:boolean;detect?:boolean}){const gps=useGpsPreparation(enabled,detect);return <Text>{gps.ready?'PREPARADO':gps.message}</Text>;}
beforeEach(()=>{jest.useFakeTimers({now:100000});jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({status:'granted',android:{accuracy:'fine'}} as Location.LocationPermissionResponse);jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({status:'granted',android:{accuracy:'fine'}} as Location.LocationPermissionResponse);jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValue(true);jest.mocked(Location.watchPositionAsync).mockImplementation(async(_options,callback)=>{fix=callback;return {remove};});});
afterEach(()=>jest.useRealTimers());
const position=(timestamp=100000,accuracy=5)=>({timestamp,coords:{latitude:40,longitude:-3,accuracy},mocked:false} as Location.LocationObject);
test('only a fresh precise fix prepares the route and an old heartbeat disables it again',async()=>{
  await render(<Preparation/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  expect(screen.queryByText('PREPARADO')).not.toBeOnTheScreen();
  await act(async()=>{fix(position(100000,200));fix(position(50000));fix(position(110000));});
  expect(screen.queryByText('PREPARADO')).not.toBeOnTheScreen();
  await act(async()=>{[-2000,-1000,0].forEach(offset=>fix(position(Date.now()+offset)));});expect(screen.getByText('PREPARADO')).toBeOnTheScreen();
  await act(async()=>{await jest.advanceTimersByTimeAsync(17000);});expect(screen.queryByText('PREPARADO')).not.toBeOnTheScreen();
});
test('leaving preparation removes its observer and ignores a late fix',async()=>{
  const view=await render(<Preparation/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  await view.rerender(<Preparation enabled={false}/>);expect(remove).toHaveBeenCalled();
  await act(async()=>{[-2000,-1000,0].forEach(offset=>fix(position(Date.now()+offset)));});expect(screen.queryByText('PREPARADO')).not.toBeOnTheScreen();
});

test('road detection keeps observing precise moving fixes without requiring the car to stop',async()=>{
 await render(<Preparation detect/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
 for(let i=0;i<25;i++)await act(async()=>{fix({...position(Date.now()),coords:{...position().coords,latitude:40+i*.0003}});await jest.advanceTimersByTimeAsync(1000);});
 expect(remove).not.toHaveBeenCalled();expect(screen.queryByText(/No se obtuvo una posición/)).not.toBeOnTheScreen();
 await act(async()=>{await jest.advanceTimersByTimeAsync(17000);});expect(remove).toHaveBeenCalled();
});
test('denied permissions never start the GPS watcher',async()=>{
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce({status:'denied',canAskAgain:false} as Location.LocationPermissionResponse);
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({status:'denied'} as Location.LocationPermissionResponse);
  await render(<Preparation/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  expect(screen.getByText(/Activa el permiso/)).toBeOnTheScreen();expect(Location.watchPositionAsync).not.toHaveBeenCalled();
});

test('timeout releases GPS and ignores callbacks until an explicit retry',async()=>{
  await render(<Preparation/>);await act(async()=>{await jest.advanceTimersByTimeAsync(20002);});
  expect(remove).toHaveBeenCalled();expect(screen.getByText(/No se obtuvo una posición precisa/)).toBeOnTheScreen();
  await act(async()=>{fix(position(Date.now()));});expect(screen.queryByText('PREPARADO')).not.toBeOnTheScreen();
});

test('native location error stops searching instead of leaving the screen waiting',async()=>{
  let error!:(reason:string)=>void;
  jest.mocked(Location.watchPositionAsync).mockImplementationOnce(async(_options,callback,errorHandler)=>{fix=callback;error=errorHandler!;return {remove};});
  await render(<Preparation/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  await act(async()=>{error('provider disabled');});
  expect(remove).toHaveBeenCalled();expect(screen.getByText(/El servicio de ubicación ha fallado/)).toBeOnTheScreen();
  await act(async()=>{[-2000,-1000,0].forEach(offset=>fix(position(Date.now()+offset)));});expect(screen.queryByText('PREPARADO')).not.toBeOnTheScreen();
});

test('a watcher that registers after timeout is removed immediately',async()=>{
  let complete!:(value:Location.LocationSubscription)=>void;
  jest.mocked(Location.watchPositionAsync).mockImplementationOnce((_options,callback)=>{fix=callback;return new Promise(resolve=>{complete=resolve;});});
  await render(<Preparation/>);await act(async()=>{await jest.advanceTimersByTimeAsync(20002);});
  await act(async()=>{complete({remove});});expect(remove).toHaveBeenCalled();
  await act(async()=>{fix(position(Date.now()));});expect(screen.queryByText('PREPARADO')).not.toBeOnTheScreen();
});

test('GPS off and approximate-only permission never prepare a new route',async()=>{
  jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValueOnce(false);
  const view=await render(<Preparation/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  expect(screen.getByText(/Activa la ubicación del móvil/)).toBeOnTheScreen();
  expect(Location.watchPositionAsync).not.toHaveBeenCalled();
  await view.unmount();
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce({status:'granted',android:{accuracy:'coarse'}} as Location.LocationPermissionResponse);
  await render(<Preparation/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  expect(screen.getByText(/ubicación precisa en Ajustes/)).toBeOnTheScreen();
  expect(Location.watchPositionAsync).not.toHaveBeenCalled();
});

test('already granted permission never opens a native permission Activity on resume',async()=>{
  const view=await render(<Preparation/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  for(let i=0;i<4;i++){
    await view.rerender(<Preparation enabled={false}/>);
    await view.rerender(<Preparation/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  }
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(Location.watchPositionAsync).toHaveBeenCalledTimes(5);
  await act(async()=>{[-2000,-1000,0].forEach(offset=>fix(position(Date.now()+offset)));});
  expect(screen.getByText('PREPARADO')).toBeOnTheScreen();
});

test('declining a permission prompt does not reopen it on foreground changes',async()=>{
  const denied={status:'denied',canAskAgain:true} as Location.LocationPermissionResponse;
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(denied);
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(denied);
  const view=await render(<Preparation/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  for(let i=0;i<3;i++){
    await view.rerender(<Preparation enabled={false}/>);
    await view.rerender(<Preparation/>);await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  }
  expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(Location.watchPositionAsync).not.toHaveBeenCalled();
  expect(screen.getByText(/Activa el permiso/)).toBeOnTheScreen();
});

test('permission check that never resolves cannot leave GPS searching forever',async()=>{
  jest.mocked(Location.getForegroundPermissionsAsync).mockImplementationOnce(()=>new Promise(()=>{}));
  await render(<Preparation/>);await act(async()=>{await jest.advanceTimersByTimeAsync(20002);});
  expect(screen.getByText(/No se obtuvo una posición precisa/)).toBeOnTheScreen();
  expect(Location.watchPositionAsync).not.toHaveBeenCalled();
});
