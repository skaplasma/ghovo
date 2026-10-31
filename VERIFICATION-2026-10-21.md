# GHOVO · Verificación local · 21/10/2026

Versión de configuración: 0.1.3 / Android versionCode 4. No se ha generado, actualizado, instalado ni publicado una APK durante este trabajo. No se ha subido código a Expo ni a otro servicio. La exportación mencionada abajo es JavaScript local.

## Resultado

- TypeScript de aplicación: correcto (`npm run typecheck`).
- TypeScript de pruebas de componentes: correcto (`npx tsc --noEmit -p tsconfig.tests.json`).
- ESLint: correcto (`npm run lint`).
- Lógica: **33 pruebas correctas**.
- Componentes, servicios simulados y almacenamiento: **53 pruebas correctas, seis suites**.
- Total: **86 pruebas correctas**, sin fallos ni pruebas omitidas.
- Expo Doctor: **20/20 comprobaciones correctas**.
- Exportación Android / Hermes: correcta, 769 módulos, paquete aproximado de 2 MB. No equivale a una compilación nativa.
- Inspección de configuración nativa en memoria: paquete y versión correctos; permisos de ubicación precisa, segundo plano y servicio presentes; `android:allowBackup="false"`; permisos antiguos READ/WRITE_EXTERNAL_STORAGE marcados para eliminar en la combinación de manifiestos.
- No se crearon carpetas nativas `android/` o `ios/`.

## Casos cubiertos

GPS válido, desordenado, simulado, impreciso o antiguo; tiempos de espera y suscripciones que terminan tarde; limpieza al salir de la app; permiso aproximado; inicio lejos de A; servicio que falla; borrador ya existente; paradas y cortes de señal. La interfaz deja de consultar periódicamente la biblioteca estando en segundo plano.

Reproducción, pausas, reinicio, velocidades, saltos, límites y fecha internacional; rutas rectas, ida y vuelta, cruces y círculos con ruido GPS; rechazo de recorrido invertido o desvío omitido. Intentos con cortes conocidos no establecen récords.

SQLite real en memoria comprueba transacciones, reversión ante fallo, migración del esquema previo, caché por revisión, reintento de apertura, conservación de bytes dañados y recuperación sin perder la copia anterior. Se inyectan fallos de disco en acciones de interfaz para comprobar que no se mutan borradores ni notas en memoria antes de confirmar la escritura.

Copias JSON: límites, coordenadas, tiempos, campos de calidad, duplicados, nombres Unicode y formatos incompatibles; importación repetida y continuidad de rutas previamente importadas. Cancelaciones no modifican biblioteca. Exportar usa caché privada y menú nativo; no se borra inmediatamente un archivo que el destinatario todavía podría estar leyendo.

## Mediciones orientativas

En este ordenador y con datos sintéticos: comparar dos trazados de unos 30 km / 10.000 puntos tardó aproximadamente **15 ms**. Calcular 100.000 posiciones del fantasma sobre ese trazado tardó unos **16 ms** en total. Son mediciones de escritorio, no promesas de rendimiento o batería Android. El ajuste de encuadre se comprueba con 150.000 puntos sin expandirlos como argumentos de una función.

## Límites de esta comprobación

Los componentes MapLibre, permisos y menús Android se simulan en las pruebas. La configuración introspectada no sustituye la combinación final de manifiestos de una APK. Falta verificar en móvil ubicación real, pantalla bloqueada, batería del fabricante, icono/splash, lector de pantalla, selector de archivos y compartir GPX/JSON.

Auditoría npm: 53 avisos (27 moderados, 26 altos, ninguno crítico), principalmente en cadenas transitivas de herramientas. No se degradó Expo ni se forzaron versiones incompatibles para ocultarlos. Deben revisarse antes de distribución pública; detalles y límites están en README.

La copia de recuperación es una sola versión anterior local. Las exportaciones contienen datos de ubicación sin cifrado adicional. No se garantiza recuperar puntos que Android no entregó o que no pudieron guardarse.

## Próximo paso autorizado

Conservar este paquete local. Cuando el usuario solicite expresamente una nueva APK, compilar el conjunto acumulado y seguir la lista de pruebas físicas del README. Hasta entonces, no ejecutar EAS Build, EAS Update ni subir fuentes.
