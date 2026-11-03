import React from 'react';
import { AppState, Linking, type AppStateStatus } from 'react-native';
import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { RouteMap } from '../src/RouteMap';
import type { Point } from '../src/core';

let mockLocationCallback: ((location: Location.LocationObject) => void) | undefined;
const mockRemove = jest.fn();
const mockCamera = { jumpTo: jest.fn(), easeTo:jest.fn(), fitBounds: jest.fn() };
let mockInitialCenter: number[] | undefined;
jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted', canAskAgain: true })),
  getForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted', canAskAgain: true })),
  hasServicesEnabledAsync: jest.fn(async () => true),
  watchPositionAsync: jest.fn(async (_options, callback) => { mockLocationCallback = callback; return { remove: mockRemove }; }),
}));
jest.mock('@maplibre/maplibre-react-native', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const passthrough = ({ children }: { children?: React.ReactNode }) => ReactModule.createElement(View, null, children);
  return {
    Map: ({ children, onDidFinishLoadingMap }: { children?: React.ReactNode; onDidFinishLoadingMap?: () => void }) => ReactModule.createElement(View, { testID: 'native-map', onLoad: onDidFinishLoadingMap }, children),
    Camera: ({ ref, initialViewState }: { ref: React.Ref<unknown>; initialViewState: { center: number[] } }) => { ReactModule.useImperativeHandle(ref, () => mockCamera); mockInitialCenter = initialViewState.center; return null; },
    Marker: passthrough, GeoJSONSource: passthrough, Layer: () => null,
    TransformRequestManager: { addHeader: jest.fn() },
  };
});
beforeEach(() => {
  jest.useFakeTimers({ now: 1700001000000 });
  mockLocationCallback = undefined; mockInitialCenter = undefined;
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ status: 'granted', granted: true, expires: 'never', canAskAgain: true } as Location.LocationPermissionResponse);
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue({ status: 'granted', granted: true, expires: 'never', canAskAgain: true } as Location.LocationPermissionResponse);
  jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValue(true);
});
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });
const props = { points: [] as Point[], recording: false };
async function mount() { await render(<RouteMap {...props} />); await act(async () => { await jest.advanceTimersByTimeAsync(1); }); }
function fix(latitude = 42, longitude = -8): Location.LocationObject { return { timestamp: Date.now(), coords: { latitude, longitude, accuracy: 5, altitude: null, altitudeAccuracy: null, heading: null, speed: null } }; }
test('cold start never mounts a provisional Madrid map and first valid fix sets the center', async () => {
  await mount();
  expect(screen.queryByTestId('native-map')).not.toBeOnTheScreen();
  await act(async () => { mockLocationCallback!(fix()); });
  expect(screen.getByTestId('native-map')).toBeOnTheScreen();
  expect(mockInitialCenter).toEqual([-8, 42]);
  expect(mockRemove).toHaveBeenCalled();
});
test('permanently denied permission offers settings without starting GPS', async () => {
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce({ status: 'denied', granted: false, expires: 'never', canAskAgain: false } as Location.LocationPermissionResponse);
  jest.spyOn(Linking, 'openSettings').mockResolvedValue();
  await mount();
  expect(Location.watchPositionAsync).not.toHaveBeenCalled();
  await userEvent.setup().press(screen.getByRole('button', { name: 'Abrir ajustes' }));
  expect(Linking.openSettings).toHaveBeenCalled();
});
test('disabled GPS displays actionable feedback and no perpetual spinner', async () => {
  jest.mocked(Location.hasServicesEnabledAsync).mockResolvedValueOnce(false);
  await mount();
  // La franja de estado sobre el mapa ya no existe: el aviso queda en el botón de ajustes
  // y en el texto del propio mapa.
  expect(screen.getByRole('button', { name: 'Centrar en mi ubicación' })).toBeOnTheScreen();
  expect(screen.getByText('El mapa aparecerá al obtener tu ubicación.')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Buscando señal GPS')).not.toBeOnTheScreen();
});
test('GPS timeout removes the watcher and late fixes cannot show a stale map', async () => {
  await mount(); const lateCallback = mockLocationCallback!;
  await act(async () => { await jest.advanceTimersByTimeAsync(20001); });
  expect(screen.getByText('El mapa aparecerá al obtener tu ubicación.')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Buscando señal GPS')).not.toBeOnTheScreen();
  await act(async () => { lateCallback(fix()); });
  expect(screen.queryByTestId('native-map')).not.toBeOnTheScreen();
  expect(mockRemove).toHaveBeenCalled();
});
test('invalid native coordinates do not reach the map camera', async () => {
  await mount();
  await act(async () => { mockLocationCallback!(fix(Number.NaN, -8)); });
  expect(screen.queryByTestId('native-map')).not.toBeOnTheScreen();
});
test('full-course control fits endpoints and the GPS watcher is disposed on unmount', async () => {
  const points = [{ latitude: 40, longitude: -3, timestamp: 0, accuracy: 5 }, { latitude: 40.02, longitude: -3.03, timestamp: 10000, accuracy: 5 }];
  const result = await render(<RouteMap points={points} recording={false} />);
  await act(async () => { await jest.advanceTimersByTimeAsync(1); });
  await fireEvent(screen.getByTestId('native-map'), 'load');
  await userEvent.setup().press(screen.getByRole('button', { name: /ruta completa/i }));
  expect(mockCamera.fitBounds).toHaveBeenCalledWith(expect.arrayContaining([expect.any(Number)]), expect.objectContaining({ duration: 400 }));
  const bounds = mockCamera.fitBounds.mock.calls.at(-1)![0];
  expect(bounds[0]).toBeLessThan(-3.03); expect(bounds[3]).toBeGreaterThan(40.02);
  await result.unmount(); expect(mockRemove).toHaveBeenCalled();
});
test('backgrounding disposes the idle GPS watcher and ignores its late callback',async()=>{
  let stateListener!:(state:AppStateStatus)=>void;
  const remove=jest.fn();
  jest.spyOn(AppState,'addEventListener').mockImplementation((_event,listener)=>{stateListener=listener;return {remove};});
  const result=await render(<RouteMap {...props}/>);
  await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  const oldCallback=mockLocationCallback!;
  await act(async()=>{stateListener('background');oldCallback(fix());});
  expect(mockRemove).toHaveBeenCalled();expect(screen.queryByTestId('native-map')).not.toBeOnTheScreen();
  await result.unmount();expect(remove).toHaveBeenCalled();
});
test('recording never starts a second idle location watcher',async()=>{
  const points=[{latitude:40,longitude:-3,timestamp:Date.now(),accuracy:5}];
  await render(<RouteMap points={points} recording/>);
  await act(async()=>{await jest.advanceTimersByTimeAsync(100);});
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();expect(Location.watchPositionAsync).not.toHaveBeenCalled();
  expect(screen.getByTestId('native-map')).toBeOnTheScreen();
});

test('preparing a saved route uses the shared GPS observer only',async()=>{
  const points=[{latitude:40,longitude:-3,timestamp:Date.now(),accuracy:5}];
  await render(<RouteMap points={points} recording={false} preparing/>);
  await act(async()=>{await jest.advanceTimersByTimeAsync(1);});
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(Location.watchPositionAsync).not.toHaveBeenCalled();
});

test('recording follows normal GPS updates with native camera animation, preserving raw points',async()=>{
 const first={latitude:40,longitude:-3,timestamp:Date.now(),accuracy:5};
 const second={...first,latitude:40.0001,timestamp:first.timestamp+1000};
 const points=Object.freeze([Object.freeze(first),Object.freeze(second)]);
 const view=await render(<RouteMap points={[first]} recording/>);
 await fireEvent(screen.getByTestId('native-map'),'load');
 mockCamera.jumpTo.mockClear();mockCamera.easeTo.mockClear();
 await view.rerender(<RouteMap points={[...points]} recording/>);
 expect(mockCamera.easeTo).toHaveBeenCalledWith({center:[-3,40.0001],duration:1000,easing:'linear'});
 expect(mockCamera.jumpTo).not.toHaveBeenCalled();expect(points[1]).toEqual(second);
 const reacquired={...second,latitude:40.001,timestamp:second.timestamp+10000};
 await view.rerender(<RouteMap points={[...points,reacquired]} recording/>);
 expect(mockCamera.jumpTo).toHaveBeenCalledWith({center:[-3,40.001],zoom:15});
 await view.unmount();
});
