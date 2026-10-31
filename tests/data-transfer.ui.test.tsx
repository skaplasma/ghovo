import * as Picker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';
import { exportLibrary, pickBackup, applyBackup,exportRouteReport } from '../src/data-transfer';
import { makeBackup } from '../src/backup';
import { writeMany } from '../src/storage';
import type { Run } from '../src/core';
let mockActive: Run | null = null;
let mockRuns: Run[] = [];
let mockText = '';
let mockSize = 0;
const mockDelete = jest.fn(), mockWrite = jest.fn(), mockCreate = jest.fn();
jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn(async () => ({ canceled: true })) }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => {}) }));
jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///cache/' } },
  File: jest.fn().mockImplementation((path, name) => ({
    uri: typeof path === 'string' ? path : path.uri + name, get size() { return mockSize; }, exists: true,
    create: mockCreate, write: mockWrite, text: jest.fn(async () => mockText), delete: mockDelete,
  })),
}));
jest.mock('../src/storage', () => ({
  active: jest.fn(async () => mockActive), history: jest.fn(async () => mockRuns),
  read: jest.fn(async (_key, fallback) => fallback), serial: jest.fn(async fn => fn()),
  writeMany: jest.fn(async () => {}),
}));
const run: Run = { id: 'one', routeId: 'route', name: 'Río 👻', startedAt: 1000, endedAt: 2000, points: [{ latitude: 40, longitude: -3, timestamp: 1000, accuracy: 5 }, { latitude: 40.001, longitude: -3, timestamp: 2000, accuracy: 5 }] };
beforeEach(() => { mockActive = null; mockRuns = [run]; mockText = JSON.stringify(makeBackup([run], {}, 3000)); mockSize = mockText.length; });
test('route report shares a CSV with statistics and keeps its cache file available to the receiver',async()=>{
  await exportRouteReport(run,[run]);
  expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('Duracion segundos'));
  expect(Sharing.shareAsync).toHaveBeenCalledWith(expect.stringMatching(/\.csv$/),expect.objectContaining({mimeType:'text/csv',UTI:'public.comma-separated-values-text'}));
  expect(mockDelete).not.toHaveBeenCalled();expect(writeMany).not.toHaveBeenCalled();
});
function select(uri = 'file:///cache/copy.json', size = mockSize) {
  jest.mocked(Picker.getDocumentAsync).mockResolvedValueOnce({ canceled: false, assets: [{ uri, name: 'copy.json', size, lastModified: 1000 }] });
}

test('export is manual, compact and leaves the cache file available to the native receiver', async () => {
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
  await exportLibrary();
  expect(mockCreate).toHaveBeenCalledTimes(1); expect(mockDelete).not.toHaveBeenCalled();
  const text = mockWrite.mock.calls[0][0]; expect(JSON.parse(text).runs[0].name).toBe('Río 👻');
  expect(text).not.toContain('\n'); expect(Sharing.shareAsync).toHaveBeenCalledWith(expect.stringContaining('file:///cache/GHOVO-'), expect.objectContaining({ mimeType: 'application/json' }));
});
test('active recording blocks export and import before touching the library', async () => {
  mockActive = { ...run, endedAt: undefined };
  await expect(exportLibrary()).rejects.toThrow('Finaliza la grabación');
  await expect(applyBackup(makeBackup([run], {}, 3000))).rejects.toThrow('Finaliza o descarta');
  expect(Sharing.shareAsync).not.toHaveBeenCalled(); expect(writeMany).not.toHaveBeenCalled();
});
test('cancelled picker does not access a file', async () => {
  expect(await pickBackup()).toBeNull(); expect(File).not.toHaveBeenCalled();
});
test('valid copied file is parsed then its temporary copy is removed', async () => {
  select(); expect((await pickBackup())!.runs[0].id).toBe('one'); expect(mockDelete).toHaveBeenCalledTimes(1);
});
test('oversized or invalid selected files cannot update storage', async () => {
  select('file:///cache/large.json', 31 * 1024 * 1024);
  await expect(pickBackup()).rejects.toThrow('30 MB');
  mockText = '{broken'; select(); await expect(pickBackup()).rejects.toThrow('JSON legible');
  expect(writeMany).not.toHaveBeenCalled(); expect(mockDelete).toHaveBeenCalledTimes(2);
});
test('cleanup never deletes a source outside the app cache', async () => {
  select('content://documents/backup.json'); await pickBackup(); expect(mockDelete).not.toHaveBeenCalled();
});
test('reimporting an existing backup does not write or replace recovery', async () => {
  expect(await applyBackup(makeBackup([run], {}, 3000))).toEqual({ added: 0, skipped: 1 });
  expect(writeMany).not.toHaveBeenCalled();
});
test('a new import uses one checkpointed write for routes and their metadata', async () => {
  mockRuns = [];
  expect(await applyBackup(makeBackup([run], { route: { favorite: true, note: 'Puente' } }, 3000))).toEqual({ added: 1, skipped: 0 });
  expect(writeMany).toHaveBeenCalledWith({ history: [run], routeDetails: { route: { favorite: true, note: 'Puente' } } }, true);
});
