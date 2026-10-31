# GHOVO · Android MVP

App personal para registrar recorridos A → B, a pie o en coche, y consultar después un fantasma personal. React Native / Expo SDK 58, TypeScript, MapLibre y SQLite. No requiere clave de Google Maps, cuenta de mapas ni tarjeta bancaria.

## Estado del proyecto

La carpeta inicial estaba vacía; el proyecto se creó aquí sin presuponer un repositorio anterior. La APK 0.1.2 fue instalada y probada por el usuario. La configuración local está en **0.1.3, Android versionCode 4** y contiene mejoras pendientes de prueba física.

**No compilar, publicar ni actualizar una APK hasta que el usuario lo indique expresamente.** Las pruebas y exportaciones de JavaScript locales no publican cambios. Las herramientas de copias añaden módulos nativos; no funcionarán simplemente recargando una APK anterior ni en Expo Go.

## Funciones

Inicio y grabación rediseñados localmente: selector de modo junto al botón fijo «Empezar recorrido», campo de nombre y explicación breve; tiempo y distancia grandes en una tarjeta, estado GPS verde/ámbar con texto y recuperación visible cuando hace falta. Interruptor de pantalla accesible y detalles agrupados en «Opciones y ayuda». Finalizar tiene color diferenciado y permanece fijo. El mapa usa un borde claro para destacar el trazado; esto no aplica ajuste a carreteras ni modifica los puntos registrados. Vista web aproximada en la carpeta hermana `ghovo-preview/`, con cartografía ilustrativa y datos de ejemplo. La APK permanece sin actualizar.

- Ubicación inicial sin un centro provisional en Madrid. Estados de búsqueda, permisos denegados, GPS desactivado, espera agotada y reintento. La ubicación de segundo plano se solicita al comenzar una grabación.
- Mapa con trazado, puntos A/B, posición personal, mascota 2D y controles «Mi ubicación» / «Ruta completa». Panel inferior ampliable.
- Grabación mediante tarea registrada fuera de React y servicio Android con notificación. Guarda lotes en SQLite y conserva el borrador al reabrir la app.
- Señal precisa reciente antes de comenzar; precisión requerida en Android y rechazo de ubicaciones simuladas. Una repetición comienza a menos de 30 m de A.
- Filtro de coordenadas inválidas, precisión peor de 25 m y tiempos fuera de orden. Se distingue el modo a pie (umbral técnico de salto 12 m/s) del coche (60 m/s): son filtros de plausibilidad GPS, no recomendaciones de velocidad. Se preserva el modo en SQLite y copias; las rutas antiguas no tienen modo conocido. Los movimientos pequeños dentro de la incertidumbre no suman distancia; las paradas se conservan.
- Solicitud de posiciones cada segundo en coche y cada dos segundos a pie, también estando parado; Android puede ajustar la entrega. Más de 30 segundos entre señales válidas se considera interrupción. Estos intentos se conservan sin nuevo récord. Las grabaciones antiguas no tienen toda la información de calidad.
- Cierre con al menos 50 m, cinco puntos y una posición válida de los últimos 15 segundos. Si falla la validación o el guardado se conserva el borrador; el servicio detenido se puede reanudar manualmente.
- Comparación ordenada, incluida ida y vuelta, círculos y cruces: extremos a 30 m, longitud dentro del 15 %, muestras cada 10 m y correspondencia a 35 m en ambos sentidos. Es una tolerancia geométrica, no navegación por calles ni garantía de exactitud competitiva.
- Fantasma posterior al paseo: pausa, continuación, reinicio, saltos de diez segundos, barra ajustable y velocidades 0,5× / 1× / 2× / 4×. No modifica el tiempo original. Se pausa al salir de la app o abrir la biblioteca.
- Biblioteca con nombres, búsqueda sin distinguir acentos, orden, favoritas, notas, intentos y actividad acumulada. Resumen del último intento con diferencia respecto al mejor anterior.
- Identidad oscura con la mascota aprobada en dibujo 2D, marcador verde ampliado, icono Android adaptable y pantalla de arranque.

Iniciar y finalizar estando parado. En coche, colocar el móvil en un soporte y no manipularlo durante la marcha. El fantasma se consulta después, sin competición en directo.

## Paquete tras la prueba en POCO F5 Pro

El usuario probó en coche y comunicó posiciones perdidas, rectas entre puntos y congelación al bloquear. El umbral antiguo de 12 m/s podía rechazar posiciones válidas a partir de unos 43 km/h; se añadió modo coche. Esto no demuestra que todas las interrupciones se debieran a ese filtro.

- **Simulador accesible en cabecera**: circuito ficticio de unos 3 km, velocidades de reproducción 1×/5×/10×, avance manual, buena señal, imprecisión y pérdida de señal. Bloqueo virtual con continuidad de la prueba. Solo memoria, sin permisos GPS, guardado de rutas, importación ni récords. La cartografía puede requerir conexión. No reproduce la suspensión real del proceso por Android.
- **Pantalla encendida durante grabación** por defecto, con interruptor para volver al apagado normal. El componente `expo-keep-awake` se monta únicamente con grabación visible y se libera al finalizar, salir al fondo o desactivar la opción. No bloquea el botón físico del móvil. Documentación: https://docs.expo.dev/versions/v58.0.0/sdk/keep-awake/ .
- **Al volver a primer plano**, comprueba si el servicio de una grabación pendiente sigue funcionando y trata de reanudarlo con los permisos ya concedidos. No garantiza que el fabricante lo mantenga activo al bloquear. La ayuda abre los ajustes de GHOVO; verificar permisos y restricciones de batería en el POCO. Referencia de limitaciones: https://docs.expo.dev/versions/v58.0.0/sdk/location/#background-location .
- **Trazado sin uniones ficticias**: separa intervalos de más de 15 segundos con desplazamiento superior a 20 m; tampoco suma ese salto ni interpola el fantasma en él. GPX conserva tramos separados. No reconstruye la carretera que falta ni realiza ajuste automático a vías.
- **Interfaz menos recargada**: acción principal fija de grabar/finalizar/crear ruta; simulador visible arriba; notas, historial y acciones agrupados en «Más opciones de la ruta», y velocidades/saltos agrupados en «Ajustes de reproducción». Falta valoración visual del usuario sobre este cambio.

Pendiente real: diagnosticar el bloqueo en el POCO con versión de MIUI/HyperOS y permisos reales, comprobar consumo y continuidad de puntos con pantalla apagada, y decidir un método de ajuste a la red viaria. El simulador permite comprobar la lógica, pero no valida antena, sensores ni batería del teléfono. No se ha actualizado la APK.

## Guardado, copias y recuperación

SQLite utiliza WAL, revisión de registros y transacciones exclusivas. Finalizar guarda historial, resultado y retirada del borrador en una sola transacción: todos o ninguno. Los valores de disco se comprueban antes de mostrarlos. Ante datos ilegibles no se borra automáticamente el historial.

Antes de guardar o modificar la biblioteca se conserva **una copia local de su estado anterior**, incluidas notas y favoritas. «Recuperar biblioteca anterior» pide confirmación porque sustituye cambios posteriores. No equivale a un historial ilimitado ni sobrevive necesariamente a la desinstalación.

Eliminar una ruta la retira de la biblioteca, pero puede seguir en esa única copia anterior hasta el siguiente cambio. La confirmación lo indica; no se presenta como un borrado irrecuperable de todas las copias.

En «Mis rutas → Copias y recuperación»:

- **Guardar copia** abre el menú nativo para elegir destino. Cerrar el menú no garantiza haber guardado: comprobar el archivo en el destino elegido.
- **Importar** admite JSON de GHOVO versión 1 y muestra un resumen antes de confirmar. Añade intentos ausentes y mantiene los existentes y sus notas. Reimportar no duplica intentos. Identificadores de ruta coincidentes sin un intento compartido se mantienen separados.
- Rechaza archivos dañados, formatos incompatibles, coordenadas o tiempos inválidos, identificadores duplicados y archivos superiores a 30 MB UTF-8. Límite por archivo: 5.000 intentos y 250.000 puntos; no es un límite automático de la biblioteca local.
- Exportación del último intento de cada ruta a **GPX**. No se admite importación GPX en este MVP.

Las copias contienen coordenadas, fechas y, en JSON, notas y favoritas. No tienen cifrado adicional. No se envían automáticamente: el usuario elige destino desde el menú del teléfono. No hay cuentas ni sincronización con un servidor propio. La base de datos permanece en el almacenamiento privado de la app; la desinstalación puede borrarla. Los archivos compartidos en caché se conservan temporalmente para que Android pueda entregarlos al destinatario.

La configuración local desactiva la copia automática de Android a la nube (`allowBackup: false`); se aplicará al compilar la próxima APK. Algunos fabricantes pueden seguir permitiendo transferencias directas entre dispositivos, según sus políticas. Usar las copias manuales para conservar rutas antes de desinstalar. [Configuración Expo](https://docs.expo.dev/versions/v58.0.0/config/app/#allowbackup), [límites de Android](https://developer.android.com/identity/data/autobackup).

Se bloquean los permisos antiguos de acceso general al almacenamiento externo que añade FileSystem por defecto. La app trabaja con su caché privada y archivos concretos elegidos por el usuario mediante el selector del sistema. [Permisos Expo](https://docs.expo.dev/guides/permissions/), [selector de documentos Android](https://developer.android.com/training/data-storage/shared/documents-files).

## Mapas

Teselas: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, con atribución visible enlazada, User-Agent propio y caché nativa. Sin descargas masivas ni mapas sin conexión. El registro GPS es independiente de la carga del mapa.

Los servidores de mapas reciben solicitudes del área visible y la dirección IP; no reciben la biblioteca. El servicio comunitario admite uso moderado y no garantiza disponibilidad. Antes de distribución amplia se necesita un proveedor apropiado o alojamiento propio y comprobar cabeceras/caché en el teléfono. Configuración en `src/RouteMap.tsx`.

[Política de teselas de OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/).

## Desarrollo y comprobaciones

Node 24 o compatible con ejecución de TypeScript sin compilación para las pruebas de lógica:

```sh
npm ci
npm run typecheck
npx tsc --noEmit -p tsconfig.tests.json
npm run lint
npm test
npx expo-doctor
npx expo export --platform android
```

`npm test` combina pruebas de lógica y SQLite real en memoria con componentes y módulos nativos simulados. La exportación Android genera JavaScript / Hermes local; **no genera APK ni verifica el teléfono**. Las simulaciones cubren permisos, temporizadores, cierre de observadores, escritura fallida, restauración, copias, importación y reproducción.

La interfaz deja de consultar periódicamente la biblioteca en segundo plano. La tarea de grabación sigue independiente. El historial se reutiliza por revisión para evitar analizar todos sus puntos en cada actualización de pantalla.

Para una futura compilación nativa autorizada, usar el perfil `preview` de `eas.json` con la cuenta y proyecto configurados. No crear manualmente `android/` o `ios/`; se generan desde Expo.

## Prueba física pendiente de la versión local

1. Comprobar icono y arranque 2D y que no aparece Madrid antes de obtener posición.
2. Estando parado, conceder ubicación precisa e iniciar un paseo de al menos 100 m. Bloquear pantalla, caminar, detenerse unos minutos y finalizar. Las paradas deben sumar tiempo sin distancia artificial.
3. Reabrir, comprobar persistencia, repetir desde A y reproducir el fantasma con pausas y velocidades.
4. Estando parado, desactivar GPS o permisos, comprobar avisos, reactivar y usar «Recuperar señal GPS». Un corte superior a 30 segundos debe impedir un nuevo récord.
5. Guardar JSON en un destino comprobado e importarlo de nuevo sin duplicados. Probar recuperación anterior y GPX en una aplicación compatible.
6. Comprobar texto grande, pantalla estrecha, lector de pantalla y menú nativo de archivos.

Android puede detener procesos por batería o políticas del fabricante. No se garantiza continuidad tras forzar cierre; se conservan los puntos guardados. Reanudar no descuenta tiempo ni rellena posiciones desconocidas.

## Dependencias y límites pendientes

Revisión del 21 de octubre de 2026: `expo-doctor` pasó 20/20 comprobaciones. Auditoría npm: **53 avisos: 27 moderados, 26 altos y ninguno crítico**, incluidas dependencias transitivas de las herramientas de Expo y Jest. Raíces revisadas: `braces`, `node-forge`, `sprintf-js` y `uuid`. Las tres primeras no tenían versión corregida publicada en la consulta; `uuid` requería un salto mayor transitivo. No se aplicó `npm audit fix --force`, que propone degradar paquetes principales y puede romper el proyecto. Repetir revisión y resolver compatibilidad antes de distribución pública.

Quedan pendientes prueba de campo, consumo real de batería, comprobación visual nativa, revisión de publicación/privacidad y protección adicional de datos según alcance. Nombre e identificador sin verificación de marca.

Referencias: [Expo Location 58](https://docs.expo.dev/versions/v58.0.0/sdk/location/), [SQLite](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/), [FileSystem](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/), [Sharing](https://docs.expo.dev/versions/v58.0.0/sdk/sharing/), [DocumentPicker](https://docs.expo.dev/versions/v58.0.0/sdk/document-picker/), [MapLibre Expo](https://maplibre.org/maplibre-react-native/docs/setup/expo/).
## Paquete visual posterior a la compilación 0.1.3

Implementado localmente: mapa con más espacio en inicio y distribución adaptada a grabación/biblioteca/resultados; acción principal según estado; biblioteca con miniaturas esquemáticas del trazado A/B (sin peticiones de mapas), distancia, fecha y mejor tiempo; búsqueda y filtros agrupados; actividad acumulada desplegable; mascota en bienvenida, biblioteca vacía y resumen; resumen centrado en el resultado con acción fija Ver mi fantasma; GPS con icono/texto y distinción de precisión para el estado preparado.

Validación: typecheck, lint y 62 pruebas de interfaz correctos. Vista previa revisada a 390×844 mediante adaptador web, mapa ilustrativo y datos ficticios. Falta comprobación visual nativa en el POCO. Este paquete no está incluido en la compilación f766aeee-acba-47b5-bc14-7e731a1c2476 enviada anteriormente: requiere una próxima APK.

## Comparación de viajes (22/10/2026)

Ver NEXT-UPDATE.md para el estado actual: rutas habituales, referencia fija por viaje, diferencias y fantasma en directo, parciales de controles, resumen por tramos y llegada automática configurable en rutas repetidas. El simulador permite probar una referencia más rápida o más lenta y la llegada sin guardar datos reales. Los avisos sonoros siguen pendientes. Última verificación: 122 pruebas correctas, tipos, lint y exportación Android; no se ha creado otra APK.
