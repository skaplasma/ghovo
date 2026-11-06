import { t as tr } from './i18n-core';
import React, { useRef, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { appStyles as s } from './design';
import { applyBackup, exportLibrary, pickBackup } from './data-transfer';
import { recoverPreviousLibrary, read, type RecoverySnapshot } from './storage';

function ToolButton({label,disabled,onPress}:{label:string;disabled:boolean;onPress:()=>void}) {
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[s.button,s.secondary,{opacity:disabled?0.45:1}]}><Text style={[s.buttonText,s.lightText]}>{label}</Text></Pressable>;
}
export function DataTools({ disabled, onChanged }: { disabled: boolean; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [message, setMessage] = useState('');
  async function perform(fn: () => Promise<void>) {
    if (locked.current || disabled) return;
    locked.current = true; setBusy(true);
    try { await fn(); } catch (error) { Alert.alert('Tus datos', error instanceof Error ? error.message : String(error)); }
    finally { locked.current = false; setBusy(false); }
  }
  async function importFile() {
    const backup = await pickBackup(); if (!backup) return;
    const routes = new Set(backup.runs.map(r => r.routeId)).size;
    Alert.alert('Importar copia de GHOVO', `El archivo contiene ${routes} rutas y ${backup.runs.length} intentos. Se añadirán los que no existan; tus datos actuales se conservan.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Importar', onPress: () => void perform(async () => { const result = await applyBackup(backup); await onChanged(); setMessage(`Importación terminada: ${result.added} intentos añadidos y ${result.skipped} ya existentes.`); }) },
    ]);
  }
  async function recover() {
    const snapshot = await read<RecoverySnapshot | null>('recovery', null);
    if (!snapshot) { setMessage('La copia de recuperación se crea al guardar o modificar tu biblioteca por primera vez.'); return; }
    Alert.alert('Recuperar biblioteca anterior', `Volverás a la copia del ${new Date(snapshot.savedAt).toLocaleString('es-ES')} (${snapshot.history.length} intentos). Los cambios posteriores de rutas, nombres, notas y favoritas se sustituirán.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Recuperar', style: 'destructive', onPress: () => void perform(async () => { await recoverPreviousLibrary(); await onChanged(); setMessage('Biblioteca anterior recuperada.'); }) },
    ]);
  }
  return <View style={s.card}>
    <Text style={s.eyebrow}>{tr("TUS DATOS, CONTIGO")}</Text><Text style={s.cardTitle}>{tr("Copias y recuperación")}</Text>
    <Text style={s.muted}>{tr('La copia JSON incluye recorridos, horas, notas y favoritas. Guárdala desde el menú del móvil en un lugar de confianza; no está cifrada.')}</Text>
    <ToolButton label={tr("Guardar copia de todas mis rutas")} disabled={disabled||busy} onPress={()=>void perform(async()=>{await exportLibrary();setMessage('Menú de guardado cerrado. Comprueba que conservas el archivo en el destino elegido.');})}/>
    <ToolButton label={tr("Importar una copia de GHOVO")} disabled={disabled||busy} onPress={()=>void perform(importFile)}/>
    <ToolButton label={tr("Recuperar biblioteca anterior")} disabled={disabled||busy} onPress={()=>void perform(recover)}/>
    {!!message && <Text accessibilityLiveRegion="polite" style={s.caption}>{message}</Text>}
  </View>;
}
