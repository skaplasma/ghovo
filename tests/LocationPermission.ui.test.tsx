import * as Location from 'expo-location';
import {foregroundLocationPermission} from '../src/location-permission';

jest.mock('expo-location',()=>({getForegroundPermissionsAsync:jest.fn(),requestForegroundPermissionsAsync:jest.fn()}));
const granted={status:'granted',canAskAgain:true,android:{accuracy:'fine'}} as Location.LocationPermissionResponse;
const denied={status:'denied',canAskAgain:true} as Location.LocationPermissionResponse;
beforeEach(()=>{
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(granted);
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue(granted);
});

test('existing permission is checked without launching the Android permission Activity',async()=>{
  expect(await foregroundLocationPermission(true)).toBe(granted);
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
});

test('resume and permanently denied access never request another permission dialog',async()=>{
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce(denied);
  expect(await foregroundLocationPermission(false)).toBe(denied);
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValueOnce({...denied,canAskAgain:false});
  expect((await foregroundLocationPermission(true)).status).toBe('denied');
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
});

test('simultaneous consumers and a resumed screen share one pending permission prompt',async()=>{
  let complete!:(permission:Location.LocationPermissionResponse)=>void;
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(denied);
  jest.mocked(Location.requestForegroundPermissionsAsync).mockImplementationOnce(()=>new Promise(resolve=>{complete=resolve;}));
  const first=foregroundLocationPermission(true);
  const second=foregroundLocationPermission(true);
  await Promise.resolve();await Promise.resolve();
  const resumed=foregroundLocationPermission(false);
  expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  complete(granted);
  expect(await Promise.all([first,second,resumed])).toEqual([granted,granted,granted]);
  // A grant is never cached across later calls: revocation is detected.
  expect(await foregroundLocationPermission(false)).toBe(denied);
});

test('failed permission request releases the shared prompt for a later retry',async()=>{
  jest.mocked(Location.getForegroundPermissionsAsync).mockResolvedValue(denied);
  jest.mocked(Location.requestForegroundPermissionsAsync).mockRejectedValueOnce(Error('native failure'));
  await expect(foregroundLocationPermission(true)).rejects.toThrow('native failure');
  expect(await foregroundLocationPermission(true)).toBe(granted);
  expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(2);
});
