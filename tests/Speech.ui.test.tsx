import * as Speech from 'expo-speech';
import {speakNotice,stopVoice,testVoice} from '../src/speech';
import type {RouteNotice} from '../src/notices';
jest.mock('expo-speech',()=>({stop:jest.fn(async()=>{}),speak:jest.fn(),getAvailableVoicesAsync:jest.fn(async()=>[{language:'es-ES'}])}));
const notice=(id:string,age=0):RouteNotice=>({id,kind:'checkpoint',title:'Control · Km 5',message:'Kilómetro cinco. Doce segundos más que la referencia.',createdAt:Date.now()-age});
beforeEach(()=>{jest.useFakeTimers({now:1700000000000});jest.mocked(Speech.stop).mockResolvedValue();jest.mocked(Speech.speak).mockImplementation(()=>{});jest.mocked(Speech.getAvailableVoicesAsync).mockResolvedValue([{language:'es-ES'} as Speech.Voice]);});
afterEach(()=>jest.useRealTimers());
test('one checkpoint is spoken once in Spanish without queueing duplicates',async()=>{
  await speakNotice(notice('once'),true);await speakNotice(notice('once'),true);
  expect(Speech.speak).toHaveBeenCalledTimes(1);expect(Speech.speak).toHaveBeenCalledWith(expect.stringContaining('Doce segundos'),expect.objectContaining({language:'es-ES'}));
});
test('muted, stale and future checkpoints produce no audio',async()=>{
  await speakNotice(notice('muted'),false);await speakNotice(notice('old',16000),true);await speakNotice(notice('future',-6000),true);
  expect(Speech.speak).not.toHaveBeenCalled();
});
test('muting cancels a pending utterance before it starts',async()=>{
  const pending=speakNotice(notice('cancelled'),true);await stopVoice();await pending;
  expect(Speech.speak).not.toHaveBeenCalled();
});
test('native audio failure returns without throwing into recording',async()=>{
  jest.mocked(Speech.stop).mockRejectedValueOnce(Error('Audio unavailable'));
  await expect(speakNotice(notice('failure'),true)).resolves.toBe(false);expect(Speech.speak).not.toHaveBeenCalled();
});
test('voice test tries speech even when the voice list would be empty',async()=>{
  jest.mocked(Speech.getAvailableVoicesAsync).mockResolvedValueOnce([]);
  jest.mocked(Speech.speak).mockImplementation((_text,options)=>{options?.onStart?.();});
  await expect(testVoice()).resolves.toBe(true);
  expect(Speech.getAvailableVoicesAsync).not.toHaveBeenCalled();
});
test('voice test reports native errors instead of claiming playback succeeded',async()=>{
  jest.mocked(Speech.speak).mockImplementation((_text,options)=>{options?.onError?.(Error('unavailable'));});
  await expect(testVoice()).resolves.toBe(false);
});
test('voice test times out when the engine never confirms playback',async()=>{
  const pending=testVoice();await jest.advanceTimersByTimeAsync(8001);
  await expect(pending).resolves.toBe(false);
});
