import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { type Run } from './core';
import { type RouteDetails } from './results';
import { active, history, read, serial, writeMany } from './storage';
import { MAX_BACKUP_BYTES, type Backup, makeBackup, mergeBackup, parseBackup, runToGpx } from './backup';
import {routeReportCsv} from './premium';

async function shareFile(content: string, extension: 'json' | 'gpx' | 'csv', title: string) {
  if (!(await Sharing.isAvailableAsync())) throw Error('El menú para guardar o compartir archivos no está disponible en este dispositivo.');
  const file = new File(Paths.cache, `GHOVO-${Date.now()}.${extension}`);
  file.create(); file.write(content);
  // Android may return after selecting a destination, before it finishes reading.
  // Keep the file in the app cache so the receiver can open its content URI.
  const formats={json:{mimeType:'application/json',UTI:'public.json'},gpx:{mimeType:'application/gpx+xml',UTI:'public.xml'},csv:{mimeType:'text/csv',UTI:'public.comma-separated-values-text'}};
  await Sharing.shareAsync(file.uri, {...formats[extension],dialogTitle:title});
}
export async function exportRouteReport(reference:Run,runs:Run[]){await shareFile(routeReportCsv(reference,runs),'csv','Guardar informe de la ruta');}
export async function exportLibrary() {
  const backup = await serial(async () => {
    if (await active()) throw Error('Finaliza la grabación antes de exportar la biblioteca.');
    return makeBackup(await history(), await read<RouteDetails>('routeDetails', {}), Date.now());
  });
  // Match the compact JSON size already checked by makeBackup; pretty-printing
  // could produce a file larger than this version is allowed to import.
  await shareFile(JSON.stringify(backup), 'json', 'Guardar copia de tus rutas de GHOVO');
}
export async function exportGpx(run: Run) { await shareFile(runToGpx(run), 'gpx', 'Guardar recorrido GPX'); }
export async function pickBackup(): Promise<Backup | null> {
  const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', 'application/octet-stream'], multiple: false, copyToCacheDirectory: true });
  if (picked.canceled) return null;
  const asset = picked.assets[0], file = new File(asset.uri);
  try {
    if ((asset.size ?? file.size) > MAX_BACKUP_BYTES) throw Error('La copia supera el límite de 30 MB.');
    return parseBackup(await file.text());
  } finally { if (file.uri.startsWith(Paths.cache.uri) && file.exists) file.delete(); }
}
export async function applyBackup(backup: Backup) {
  return serial(async () => {
    if (await active()) throw Error('Finaliza o descarta la grabación antes de importar una copia.');
    const merged = mergeBackup(await history(), await read<RouteDetails>('routeDetails', {}), backup);
    if (merged.added) await writeMany({ history: merged.runs, routeDetails: merged.routeDetails }, true);
    return { added: merged.added, skipped: merged.skipped };
  });
}
