// Traduce fallos técnicos a mensajes que se puedan entender sin ser programador.
// Los mensajes que ya escribe la app en español se dejan tal cual.
const RULES: {match: RegExp; message: string}[] = [
  {
    match: /no such table|createSyncAccessHandle|FileSystemFileHandle|database is locked|SQLITE|disk i\/o|unable to open database/i,
    message: 'No hemos podido leer tus rutas guardadas. No se ha borrado nada: reintenta o restaura una copia anterior.',
  },
  {
    match: /no space|quota|disk full|ENOSPC/i,
    message: 'No queda espacio libre en el móvil. Libera algo de espacio y vuelve a intentarlo.',
  },
  {
    match: /permission|denied|permiso concedido|not granted/i,
    message: 'Android no ha dado permiso para esta acción. Revísalo en los ajustes de GHOVO.',
  },
  {
    match: /network|fetch failed|timeout|offline|Failed to fetch|ECONN/i,
    message: 'No hay conexión con el servidor. Comprueba tu red e inténtalo de nuevo.',
  },
];

export function technicalDetail(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  return raw;
}

export function describeError(error: unknown, fallback = 'No se ha podido completar la operación.'): string {
  const raw = technicalDetail(error);
  const rule = RULES.find(candidate => candidate.match.test(raw));
  if (rule) return rule.message;
  // Un mensaje corto en español ya viene redactado por la app: se muestra tal cual.
  return raw && raw.length <= 160 ? raw : fallback;
}
