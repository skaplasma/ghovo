import {recordGpsEvent,gpsEvents} from '../src/gps-diagnostics';
import {read,write} from '../src/storage';
let mockEvents:unknown[]=[];
jest.mock('../src/storage',()=>({read:jest.fn(async()=>mockEvents),write:jest.fn(async(_key,value)=>{mockEvents=value;}),serial:jest.fn(async fn=>fn())}));
beforeEach(()=>{jest.useFakeTimers({now:1700001000000});mockEvents=[];});
afterEach(()=>jest.useRealTimers());
test('diagnosis is bounded, omits coordinates and coalesces repeated events',async()=>{
  mockEvents=Array.from({length:200},(_,i)=>({at:100+i,code:'search'}));
  recordGpsEvent('weak',80);await Promise.resolve();await Promise.resolve();
  recordGpsEvent('weak',80);await Promise.resolve();await Promise.resolve();
  const events=await gpsEvents();expect(events).toHaveLength(200);expect(write).toHaveBeenCalledTimes(1);
  expect(events.at(-1)).toEqual({at:Date.now(),code:'weak',accuracy:80});
  expect(JSON.stringify(events)).not.toContain('latitude');
});
test('diagnostic storage failure is contained and does not throw into GPS',async()=>{
  jest.mocked(read).mockRejectedValueOnce(Error('disk unavailable'));
  expect(()=>recordGpsEvent('provider')).not.toThrow();await Promise.resolve();await Promise.resolve();
});
