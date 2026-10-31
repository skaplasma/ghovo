import React from 'react';
import { Alert } from 'react-native';
import { act, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { DataTools } from '../src/DataTools';
import { applyBackup, exportLibrary, pickBackup } from '../src/data-transfer';
import { read, recoverPreviousLibrary } from '../src/storage';
import type { Backup } from '../src/backup';

jest.mock('../src/data-transfer', () => ({
  applyBackup: jest.fn(async () => ({ added: 1, skipped: 0 })),
  exportLibrary: jest.fn(async () => {}), pickBackup: jest.fn(async () => null),
}));
jest.mock('../src/storage', () => ({ read: jest.fn(async () => null), recoverPreviousLibrary: jest.fn(async () => {}) }));
const backup: Backup = { format: 'ghovo-backup', version: 1, createdAt: 1000, routeDetails: {}, runs: [{
  id: 'one', routeId: 'course', name: 'Paseo', startedAt: 1000, endedAt: 2000,
  points: [{ latitude: 40, longitude: -3, timestamp: 1000, accuracy: 5 }, { latitude: 40.001, longitude: -3, timestamp: 2000, accuracy: 5 }],
}] };
beforeEach(() => { jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
afterEach(() => { jest.restoreAllMocks(); });
const actions = () => jest.mocked(Alert.alert).mock.calls.at(-1)![2]!;

test('disabled tools cannot export, import or recover while recording', async () => {
  await render(<DataTools disabled onChanged={jest.fn()} />);
  const user = userEvent.setup();
  for (const button of screen.getAllByRole('button')) { expect(button).toBeDisabled(); await user.press(button); }
  expect(exportLibrary).not.toHaveBeenCalled(); expect(pickBackup).not.toHaveBeenCalled(); expect(read).not.toHaveBeenCalled();
});

test('cancelled picker and cancelled import never change the library', async () => {
  const changed = jest.fn(); await render(<DataTools disabled={false} onChanged={changed} />);
  const user = userEvent.setup();
  await user.press(screen.getByRole('button', { name: 'Importar una copia de GHOVO' }));
  expect(Alert.alert).not.toHaveBeenCalled();
  jest.mocked(pickBackup).mockResolvedValueOnce(backup);
  await user.press(screen.getByRole('button', { name: 'Importar una copia de GHOVO' }));
  expect(Alert.alert).toHaveBeenCalledWith('Importar copia de GHOVO', expect.stringContaining('1 rutas y 1 intentos'), expect.any(Array));
  expect(actions().find(action => action.text === 'Cancelar')?.style).toBe('cancel');
  expect(applyBackup).not.toHaveBeenCalled(); expect(changed).not.toHaveBeenCalled();
});

test('confirmed import adds data then refreshes and reports the result', async () => {
  jest.mocked(pickBackup).mockResolvedValueOnce(backup);
  const changed = jest.fn(async () => {}); await render(<DataTools disabled={false} onChanged={changed} />);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Importar una copia de GHOVO' }));
  await act(async () => { actions().find(action => action.text === 'Importar')!.onPress!(); });
  expect(applyBackup).toHaveBeenCalledWith(backup); expect(changed).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/1 intentos añadidos y 0 ya existentes/)).toBeOnTheScreen();
});

test('import failure preserves the library and restores the controls', async () => {
  jest.mocked(pickBackup).mockResolvedValueOnce(backup);
  jest.mocked(applyBackup).mockRejectedValueOnce(Error('No hay espacio disponible'));
  const changed = jest.fn(async () => {}); await render(<DataTools disabled={false} onChanged={changed} />);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Importar una copia de GHOVO' }));
  await act(async () => { actions().find(action => action.text === 'Importar')!.onPress!(); });
  expect(Alert.alert).toHaveBeenLastCalledWith('Tus datos', 'No hay espacio disponible');
  expect(changed).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Importar una copia de GHOVO' })).toBeEnabled();
});

test('recovery requires confirmation and refreshes only after success', async () => {
  jest.mocked(read).mockResolvedValueOnce({ savedAt: 1000, history: backup.runs, routeDetails: {}, lastResult: null });
  const changed = jest.fn(async () => {}); await render(<DataTools disabled={false} onChanged={changed} />);
  await userEvent.setup().press(screen.getByRole('button', { name: 'Recuperar biblioteca anterior' }));
  expect(recoverPreviousLibrary).not.toHaveBeenCalled();
  expect(actions().find(action => action.text === 'Recuperar')?.style).toBe('destructive');
  await act(async () => { actions().find(action => action.text === 'Recuperar')!.onPress!(); });
  expect(recoverPreviousLibrary).toHaveBeenCalledTimes(1); expect(changed).toHaveBeenCalledTimes(1);
});

test('repeated taps cannot open two native share operations', async () => {
  let release!: () => void;
  jest.mocked(exportLibrary).mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; }));
  await render(<DataTools disabled={false} onChanged={jest.fn()} />);
  const user = userEvent.setup(), button = screen.getByRole('button', { name: 'Guardar copia de todas mis rutas' });
  await user.press(button); await user.press(button);
  expect(exportLibrary).toHaveBeenCalledTimes(1); expect(button).toBeDisabled();
  await act(async () => { release(); });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar copia de todas mis rutas' })).toBeEnabled());
});
