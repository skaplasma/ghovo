import {getLocales} from 'expo-localization';
import {useSyncExternalStore} from 'react';
import {read, write} from './storage';
import {applyLanguage, currentLanguage, languageChoice, speechLocale, subscribeLanguage, t, type Language, type LanguageChoice} from './i18n-core';

// Capa de dispositivo: detecta el idioma del teléfono, guarda la elección del usuario y
// ofrece el hook de pantalla. La traducción en sí vive en i18n-core, sin módulos nativos.
export type {Language, LanguageChoice};
export {currentLanguage, languageChoice, speechLocale, t};

export function detectLanguage(): Language {
  try {
    for (const locale of getLocales()) {
      const code = (locale.languageCode ?? '').toLowerCase();
      if (code === 'eu' || code === 'ca' || code === 'fr' || code === 'es') return code;
    }
  } catch {
    // Sin módulo nativo se queda en español.
  }
  return 'es';
}

function resolve(value: LanguageChoice): Language {
  return value === 'auto' ? detectLanguage() : value;
}

// Detecta antes del primer render para no arrancar en español y cambiar de golpe.
applyLanguage('auto', resolve('auto'));

export async function initializeLanguage() {
  let stored: LanguageChoice = 'auto';
  try {
    const value = await read<string>('language', 'auto');
    if (value === 'es' || value === 'eu' || value === 'ca' || value === 'fr') stored = value;
  } catch {
    stored = 'auto';
  }
  applyLanguage(stored, resolve(stored));
}

export async function setLanguage(value: LanguageChoice) {
  applyLanguage(value, resolve(value));
  await write('language', value);
}

// Hook de pantalla: provoca repintado al cambiar de idioma y devuelve el traductor.
export function useLanguage() {
  useSyncExternalStore(subscribeLanguage, currentLanguage, currentLanguage);
  return {language: currentLanguage(), choice: languageChoice(), t};
}
