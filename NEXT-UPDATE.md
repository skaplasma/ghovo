## El mejor tiempo, en su propia franja — 06/11/2026 (sin APK)

En «Mis rutas» el mejor tiempo iba en una línea pequeña, perdido entre la fecha y el número de salidas. Ahora cada tarjeta tiene una **franja propia** debajo, con el trofeo, la etiqueta y el tiempo a 26 px en dorado:

```
┌──────────────────────────────────────────┐
│ [miniatura]  COCHE              ♥   ⤴    │
│              Paseo del río               │
│              12 mar · 4,20 km · 3 salidas│
│  ┌────────────────────────────────────┐  │
│  │ 🏆  MEJOR TIEMPO            24:31  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

Si el intento con mejor tiempo no es comparable (por ejemplo, tiene cortes de GPS), la etiqueta pasa a «TIEMPO DE REFERENCIA» en vez de «MEJOR TIEMPO», para no prometer un récord que no es tal.

186 pruebas de interfaz y 102 de lógica, `tsc` limpio y `eslint` 0 errores.

## Salida y llegada: remates de robustez — 06/11/2026 (sin APK)
## Salida y llegada: remates de robustez — 06/11/2026 (sin APK)

Sobre el arreglo anterior, tres remates para que no queden casos raros.

- **La cabina dice a cuántos metros está la salida.** Mientras no cruzas la línea, debajo de «Esperando…» aparece `A 240 m de la salida`, redondeado a decenas. Así se entiende por qué el reloj y los kilómetros siguen a cero, en vez de parecer que la app se ha quedado parada.
- **Margen de meta ampliado a 50 m.** La estimación de los metros que faltaban al parar cubría 30 m; ahora cubre 50, que es justo la tolerancia con la que el recorrido se considera completo. Parar a 40 m de B ya no regala 4 segundos de ventaja.
- **Pruebas nuevas**: la distancia a la salida en la cabina y el caso de parar a 40 m de la meta.

102 pruebas de lógica y 186 de interfaz, `tsc` limpio y `eslint` 0 errores.

### Lo que queda fuera a propósito

- **Recalcular las referencias antiguas.** Sus tiempos incluyen el aparcamiento de cuando se grabaron, porque en ese momento no se congelaba el cronómetro. Se corrigen solas al volver a grabar la ruta. Recalcularlas desde los puntos sería adivinar dónde estaba la meta en cada una, y prefiero no tocar tus datos históricos sin poder comprobarlo.
- **Entrada en sentido contrario.** Si entras en la ruta en dirección opuesta, el fantasma avanza en contra. Detectarlo bien requiere comparar rumbos con el trazado y no compensa ahora.

## Salida y llegada al detalle: el cronómetro empieza en la línea y se congela en la meta — 05/11/2026 (sin APK)
## Salida y llegada al detalle: el cronómetro empieza en la línea y se congela en la meta — 05/11/2026 (sin APK)

El fallo de los «+13 segundos» salía de aquí: al llegar, el cronómetro seguía corriendo y se comparaba contra el fantasma, que ya estaba parado en la meta. Cada segundo aparcado sumaba un segundo de desventaja.

### Lo que cambia

- **El cronómetro se congela al cruzar la meta.** Cuando el avance llega al final del trazado se guarda el instante exacto del cruce, interpolado entre las dos últimas posiciones, y la diferencia deja de moverse. Aparcar, esperar o quedarse mirando el móvil ya no suma segundos.
- **La ruta se cierra al cruzar la meta, sin exigir que pares.** Antes hacía falta estar parado tres segundos; ahora el cruce de la línea es suficiente. La regla de «parado un par de segundos cerca de B» se queda como respaldo por si aparcas antes de la línea.
- **Lo grabado después de la meta no cuenta.** Al guardar se recorta la cola posterior al cruce: el tiempo y la distancia terminan en la línea, no en la última posición. La frescura del GPS se sigue midiendo con la última posición recibida, para que aparcar no marque el intento como «sin verificar».
- **Antes de cruzar la salida no corre nada.** En una ruta con referencia, la cabina muestra `00:00` y `0,00 km` hasta que entras: acercarte hasta la salida ya no suma ni tiempo ni distancia. En una ruta libre, sin línea, sigue contando desde que pulsas.
- **La distancia del intento se mide de línea a línea.** El resumen, las estadísticas y el tiempo medio usan el tramo recorrido entre la salida y la meta, sin el acercamiento ni el aparcamiento.
- **Entrar a mitad ya no falsea el resultado.** La diferencia final contra el fantasma se toma del último parcial comparado, no de la duración total, así que un intento que entra en el kilómetro 2 no parece «más rápido» que la ruta completa. Además, ese intento ya no puede arrebatarle el récord a uno completo.
- **El aviso de voz de llegada usa el mismo cálculo**, para que lo que oyes coincida con lo que ves.

### Pruebas nuevas

- Aparcar 30 s en la meta no altera la diferencia (antes crecía hasta +30 s).
- Parar a 20 m de la meta estima el tiempo que faltaba en lugar de inventar una ventaja.
- Cruzar la línea a 40 km/h cierra y guarda sin frenar.
- Antes de la salida, `00:00`; al cruzar la meta, el tiempo congelado.
- Un intento que entra a mitad compara su tramo y no se marca como récord.

101 pruebas de lógica y 185 de interfaz, `tsc` limpio y `eslint` 0 errores.

## Favorita y compartir en la lista de rutas — 05/11/2026 (sin APK)
## Favorita y compartir en la lista de rutas — 05/11/2026 (sin APK)

- **Dos acciones en cada tarjeta de «Mis rutas»**, arriba a la derecha: el corazón y el icono de compartir. Tocar el corazón marca o desmarca la favorita en el momento, y compartir abre el menú del sistema con el GPX, **sin tener que abrir la ruta**. Se retira la flecha de la tarjeta, que ya no hace falta para nada.
- La tarjeta sigue abriendo la ruta al tocarla en cualquier otro punto; los dos iconos capturan su propio toque.
- **Fuera el aviso «Detente antes de finalizar»** de la barra inferior: ocupaba una línea y no aportaba nada. El aviso de «Asegurando señal GPS» se mantiene, que ese sí informa.
- La favorita desde la lista usa el mismo almacén que la de dentro de la ruta, así que coincide con el filtro de favoritas.

182 pruebas de interfaz (una nueva: favorita y compartir desde la tarjeta sin abrir la ruta) y 97 de lógica, `tsc` limpio y `eslint` 0 errores.

## Compartir ruta — 05/11/2026 (sin APK)

- **Botón «⤴ Compartir» en la cabecera de la ruta**, en dos columnas junto a la favorita (`☆ Favorita` / `⤴ Compartir`), así está a un toque desde cualquier pestaña de la ruta. Se retira el botón que había quedado suelto en el contenido.
## Compartir ruta — 05/11/2026 (sin APK)

- **Botón «⤴ Compartir» en la cabecera de la ruta**, en dos columnas junto a la favorita (`☆ Favorita` / `⤴ Compartir`), así está a un toque desde cualquier pestaña de la ruta. Se retira el botón que había quedado suelto en el contenido.
- **Comparte el trazado en un archivo GPX**, listo para WhatsApp, correo o cualquier app de mapas.
- **El archivo lleva el nombre de la ruta**: `GHOVO-Casa-Trabajo.gpx` en vez de `GHOVO-1730…`. Se limpian acentos y emojis para que el nombre sea válido en cualquier sistema.
- **Solo se comparten intentos cerrados**: si el recorrido está a medias, avisa en lugar de generar un GPX incompleto.
- Se reutiliza la infraestructura de exportación que ya existía (`runToGpx` + `expo-sharing`), sin dependencias nuevas ni permisos.

181 pruebas de interfaz (dos nuevas: el GPX con nombre limpio y el rechazo de un recorrido sin terminar) y 97 de lógica, `tsc` limpio y `eslint` 0 errores.

## Aire entre la etiqueta y la cifra en la cabina — 05/11/2026 (sin APK)

Las tres cajas de la pantalla de grabación tenían la etiqueta pegada (y a ratos solapada) con la cifra: la etiqueta llevaba una altura fija de 14 px que recortaba la línea y el valor quedaba justo debajo. Ahora cada línea tiene su `lineHeight` propio (16 para la etiqueta, 32 para la cifra y 14 para la unidad) y el hueco entre ellas sube a 2 px, así que se lee «TIEMPO» arriba, «00:27» en medio y «min» abajo sin tocarse.

179 pruebas de interfaz y 97 de lógica, `tsc` limpio y `eslint` 0 errores.

## Pantalla de grabación: minutos en la diferencia, cifras alineadas y menos ruido — 05/11/2026 (sin APK)

- **La diferencia con el fantasma pasa a minutos** cuando hace falta: por debajo de 60 s sigue en segundos con un decimal (`▲ -2,4 s`) y a partir de ahí muestra `▲ -1:20 min`. Se acabó tener que dividir mentalmente entre 60.
- **Las tres cifras quedan alineadas**: tiempo, distancia y velocidad media usan ahora la misma estructura de tres líneas (etiqueta, valor y unidad), con la etiqueta y la unidad a altura fija. El valor de la velocidad media ya no cae más abajo porque su etiqueta fuera más larga. Los números suben de 18 a 26 px y la unidad sale en su propia línea, así que también dejan de encogerse para caber.
- **Se elimina el bloque «Opciones y ayuda»** del final del panel: el diagnóstico, la ayuda de pantalla bloqueada y «Guardar para más tarde» duplicaban acciones que ya están en la barra inferior («Guardar y salir») o que aparecen solas cuando hay un problema de GPS («Recuperar señal GPS»). El diagnóstico sigue disponible en la pantalla de GPS. Con ello el panel termina en las cifras y los interruptores de pantalla y voz.

179 pruebas de interfaz y 97 de lógica, `tsc` limpio y `eslint` 0 errores. Dos pruebas cambian de expectativa a propósito: la de «guardar para más tarde» usa el botón de la barra inferior y la de opciones comprueba que el bloque ya no existe.

## Privacidad en Perfil, escritura incremental y batería de MIUI — 04/11/2026 (sin APK)

Cierra los dos pendientes técnicos y añade la privacidad dentro de la app.

- **Privacidad accesible desde Perfil**: nueva fila «Privacidad» que abre una pantalla con el resumen de datos (qué se guarda en el móvil, qué viaja al servidor, ubicación, anuncios, terceros, diagnóstico, derechos y menores) y un botón que abre la política completa en el navegador. La URL se configura con `EXPO_PUBLIC_PRIVACY_URL`, así que se puede cambiar sin recompilar.
- **Escritura incremental del recorrido en curso**: las posiciones dejan de ir dentro del JSON del recorrido. Ahora viven en la tabla `active_points`, una fila por punto, y la cabecera (sin puntos) en `state`. Cada posición GPS anexa una fila en vez de reescribir el recorrido completo; en una ruta larga eso pasa de cientos de kilobytes por segundo a unos pocos bytes. `write('active')` sigue funcionando como escritura completa y reemplaza la tabla, y `saveActive(run, nuevas)` es el camino caliente que usa la tarea de fondo. Si la cabecera guardada es de otro recorrido, la tabla se reemplaza para no mezclar posiciones.
- **Batería sin restricciones en Perfil**: en Android, un botón abre la lista de exclusión de optimización de batería (`IGNORE_BATTERY_OPTIMIZATION_SETTINGS` mediante `expo-intent-launcher`) para marcar GHOVO como «sin restricciones», que es lo que evita que MIUI/HyperOS mate la grabación al bloquear. No pide permisos nuevos.

178 pruebas de interfaz (cuatro nuevas: privacidad desde Perfil, contenido de la pantalla y dos del almacén incremental) y 97 de lógica, `tsc` limpio y `eslint` 0 errores. Dependencia nueva: `expo-intent-launcher`, que obliga a compilar.

## Preparación para Google Play — 04/11/2026 (sin APK)

- **Perfil `production`** en `eas.json`: `.aab`, `distribution: store`, `autoIncrement` para que el `versionCode` suba solo en cada subida y `submit.production`.
- **`expo-dev-client` sale de `dependencies`**: el menú de desarrollo no viaja en la compilación de tienda. El `package-lock.json` se ha regenerado con la nueva ubicación.
- **Acceso invitado desactivado de serie**: el botón «Entrar sin registrarse» solo se renderiza con `EXPO_PUBLIC_GUEST_ACCESS=1`, así que una compilación de tienda no tiene puerta trasera al muro de cuenta. La prueba de la portada activa la variable para seguir cubriendo ese camino.
- **Recursos de ficha** en `store/`: `icon-512.png` (512×512, sin alfa) y `feature-graphic-1024x500.png` (1024×500, RGB, con degradado morado, fantasma, logotipo y lema).
- **`PLAY-STORE.md`**: orden de la consola, textos de ficha (descripción corta y larga), declaración de anuncios, tabla de Data safety, justificación del permiso de ubicación en segundo plano lista para pegar, credenciales de revisión, clasificación de contenido y comandos de compilación y envío.

174 pruebas de interfaz y 97 de lógica, `tsc` limpio y `eslint` 0 errores. Sin compilación: se acumula.

## Fallos de la prueba real: guardado, fantasma e imagen de arranque — 03/11/2026 (sin APK)

Tres fallos comunicados después de usar la app en la calle.

- **«Me salió sin verificar» al llegar.** `completeRun` marcaba como no verificable cualquier intento con `referenceOffsetMs`, es decir, todo recorrido que no había empezado exactamente en A. Ahora la referencia se recorta al punto de incorporación antes de comparar, así que un intento que entra en la ruta a mitad se guarda verificado y con su comparación. Además se recorta la **cola de aparcamiento**: si el último tramo se aleja de la meta, se compara solo hasta el último punto que aún estaba a menos de 50 m de B. Un desvío real a mitad de ruta sigue invalidando el intento (`sameCourse` sobre la traza recortada), y los récords siguen exigiendo circuito completo (`isFullCourse`).
- **El fantasma empezaba en la salida.** `routeEntry` redondeaba a 0 cualquier incorporación en los primeros 50 m, así que si entrabas 40 m más adelante el fantasma aparecía en A. Ahora solo se redondea por debajo de 25 m —el ruido del GPS al arrancar— y por encima se respeta el punto exacto de incorporación, con el tiempo de referencia correspondiente a ese punto. La comparación, el parcial de meta y el fantasma usan todos la referencia recortada.
- **Imagen de arranque cortada.** Android 12 recorta el icono de la cortina en un círculo; el fantasma iba a sangre y se veían cortados los lados. Nueva imagen `assets/ghovo-splash-v1.png`, el mismo dibujo al 66 % centrado sobre lienzo transparente, y `imageWidth` sube a 220.

97 pruebas de lógica (una nueva: incorporarse a mitad, fantasma en el punto de entrada y guardado verificado terminando 200 m después de B) y 174 de interfaz. Dos pruebas cambian de expectativa a propósito: aparcar 120 m al lado de B ya no marca el intento como no verificable, y un intento incorporado a mitad pasa a ser comparable aunque no cuente para récords.

## Cabina compacta en lugar del velocímetro circular — 03/11/2026 (sin APK)

El velocímetro de 200 px más el panel de diferencia ocupaban casi 300 px del panel de grabación. Se sustituyen por **una sola fila de cabina** de unos 76 px:

- A la izquierda, la velocidad grande (40 px) con su unidad y una barra fina de progreso hacia el máximo orientativo del modo. En modo correr muestra el ritmo en min/km.
- A la derecha, la diferencia con el fantasma en el mismo formato de antes pero a 22 px: `▲ -2,4 s` en verde, `▼ +2,4 s` en rojo, `= 0,0 s` en neutro.
- Los estados de espera caben en ese hueco: «Esperando… / El fantasma arranca al entrar» y «Confirmando… / Una posición más sobre el trazado».

Se elimina `src/SpeedGauge.tsx` y la dependencia de `react-native-svg` deja de usarse en esta pantalla (el paquete sigue instalado por si se recupera el arco). El espacio ganado va al mapa y a los márgenes, no a más widgets.

174 pruebas de interfaz, 96 de lógica, `tsc` limpio y `eslint` 0 errores. Sin compilación: si el formato no convence al probarlo, se ajusta en un cambio pequeño.

## Borrado de cuenta y política de privacidad — 03/11/2026 (sin APK)

Requisitos de Google Play que faltaban, sin tocar la captura GPS ni el esquema de rutas.

- **Eliminar mi cuenta** en Perfil, al final de la página, con doble confirmación («¿Eliminar tu cuenta?» → «Eliminar todo»). Borra la cuenta en el servidor y, solo si eso ha ido bien, los datos del móvil: `wipeLocalData()` vacía las tablas `state` y `runs` y las cachés en memoria. Si la llamada al servidor falla no se borra nada en local, para no dejar al usuario sin cuenta y sin historial por un error de red.
- **La baja la ejecuta el servidor**: la app no puede eliminar su propio usuario de autenticación. `supabase/borrado-de-cuenta.sql` crea `public.ghovo_delete_account()`, `security definer`, que solo borra `auth.uid()`; hay que pegarla en el SQL Editor del proyecto. Si las tablas de monetización no tienen `ON DELETE CASCADE` hacia `auth.users`, el archivo deja los borrados preparados para descomentar.
- **`PRIVACIDAD.md`**: texto completo (responsable, datos, finalidad, base legal, terceros, plazos, derechos, menores, seguridad) listo para colgar en una URL pública y enlazar en la ficha. Incluye cómo exportar y cómo pedir la baja sin acceso a la app, que es lo que revisa Play.

174 pruebas de interfaz (una nueva del borrado), 96 de lógica, `tsc` limpio y `eslint` 0 errores. Sin compilación.

## Anuncios terminados: consentimiento, IDs configurables y circuito cerrado — 03/11/2026 (sin APK)

Repaso de lo que ya existía y cierre del apartado de anuncios recompensados.

**Ya estaba**: SDK nativo de AdMob con sus ids de prueba, precarga del anuncio recompensado, eventos LOADED/EARNED_REWARD/CLOSED/ERROR con limpieza de suscripciones, abono del crédito en servidor con `ghovo_claim_reward`, límites de 10 al día y 50 acumulados, y bloqueo con ruta activa.

**Añadido ahora**:

- **Consentimiento (UMP)** en `src/ads.ts` con `AdsConsent`: `requestInfoUpdate`, formulario si es obligatorio y `canRequestAds` como condición previa. Sin consentimiento no se pide ningún anuncio, `loadRewardedAd` no hace nada y `showRewardedAd` rechaza. Al volver del formulario se recarga el anuncio si el usuario ha aceptado.
- **Opciones de privacidad** desde Perfil: botón que abre `showPrivacyOptionsForm`, para poder cambiar o retirar el consentimiento cuando el usuario quiera.
- **IDs configurables por entorno**: `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`, `EXPO_PUBLIC_ADMOB_IOS_APP_ID` (se aplican al compilar, en `app.config.ts`) y `EXPO_PUBLIC_ADMOB_REWARDED_UNIT` (en ejecución). Documentados en `.env.example`. Mientras falten se usan los de prueba de Google y la pantalla lo advierte: «Versión de pruebas: Google sirve anuncios de prueba, sin ingresos».
- **Estado de consentimiento en la interfaz**: si falta, el botón de ver el anuncio queda deshabilitado, se explica por qué y aparece «Opciones de privacidad»; el texto de ayuda prioriza el motivo real (ruta activa, límite diario, tope de créditos, sin consentimiento, cargando).

**Pendiente para ingresos reales** (requiere cuentas, no código): crear la cuenta de AdMob y la unidad recompensada, dar de alta las variables, publicar el producto Premium en Play Console y sustituir el abono desde el cliente por la verificación **SSV** de Google en el servidor. Mientras el crédito lo pida la app tras `EARNED_REWARD`, un cliente modificado podría reclamarlo sin ver el vídeo; el límite diario y el libro de movimientos en servidor acotan el daño, pero no lo sustituyen.

173 pruebas de interfaz (dos nuevas para el consentimiento), 96 de lógica, `tsc` limpio y `eslint` 0 errores. Sin compilación.

## Seguro de arranque: dos posiciones para activar el fantasma — 03/11/2026 (sin APK)

Una sola posición sobre el trazado ya no basta para dar por iniciada la ruta. Aunque se pase junto a la línea, el GPS puede tener 20 m de error y una calle paralela puede coincidir; con el fantasma en marcha el tiempo se contaba desde antes de entrar.

- **Confirmación en dos pasos**: la primera posición válida sobre el trazado solo marca `entryPendingAt`. La segunda, separada por **menos de 5 s**, confirma la entrada y entonces se fija `circuitStartedAt`, `referenceOffsetMs` y arranca la comparación. Si la segunda posición ya no está sobre el trazado, la entrada pendiente se descarta.
- **Arrancar encima de la ruta** también pasa por el mismo seguro: `startTracking` deja la entrada pendiente en lugar de activar el cronómetro, así que el fantasma sale con la segunda posición y no con la primera.
- **Interfaz**: mientras se espera la confirmación, el panel dice «Confirmando entrada…» y «Una posición más sobre el trazado y arranca el fantasma», en vez de dejar al usuario sin saber si el sistema le ha visto.
- El tiempo previo a la confirmación no forma parte del intento: el cronómetro empieza en la posición que confirma la entrada, y las comparaciones y los parciales se calculan desde ahí.

Pruebas actualizadas: el arranque en mitad de la ruta comprueba ahora el estado pendiente y luego la confirmación con una segunda posición; la llegada automática calcula el parcial desde `circuitStartedAt`. 96 pruebas de lógica y 171 de interfaz, `tsc` limpio y `eslint` 0 errores. Sin compilación: se acumula para el próximo lote.

## Entrada a la ruta más estricta y dos remates de interfaz — 03/11/2026 (sin APK)

- **El fantasma ya no arranca antes de entrar en la ruta.** La detección de entrada se había relajado a 80 m en la salida y 45 m en el resto del trazado, y eso hacía que una calle paralela o el punto donde aparcas al empezar contaran como «estoy en la ruta»: el cronómetro y el fantasma echaban a andar sin haber llegado. Vuelve a **30 m en la salida y 25 m en el resto**, que es ancho de calzada más error de GPS sin coger calles de al lado. Al detectarse la entrada se sigue fijando `referenceOffsetMs` con el punto exacto de incorporación, así que el fantasma aparece sincronizado en ese punto y no al principio del trazado.
- **Icono de volver en la pantalla de ruta**: era un chevron hacia abajo y ahora es una flecha a la izquierda, coherente con lo que hace.
- **Perfil sin título duplicado**: la cabecera ya no repite «Perfil» porque la pestaña inferior indica dónde estás. La pantalla de Premium conserva su título, que sí aporta.

96 pruebas de lógica y 171 de interfaz, `tsc` limpio y `eslint` 0 errores. Sin compilación: se acumula para el próximo lote.

## Más mapa y botón con halo — 03/11/2026 (0.1.24)

- **Fuera la franja de estado del mapa**: la línea que ocupaba el ancho bajo el mapa («Ubicación aproximada», «Buscando…») desaparece; el mapa gana esos píxeles. El aviso sigue en la tarjeta de ubicación de Inicio y en la pantalla de estado del GPS, y el propio mapa mantiene su texto de espera cuando todavía no hay posición.
- **Atribución mínima**: «© OpenStreetMap» pasa a 8 px, sin fondo ni recuadro, en la esquina inferior izquierda. No se elimina porque la licencia de las teselas exige atribución visible; si algún día se cambia de proveedor, se puede quitar del todo.
- **Botón «Comenzar ruta» con halo**: dos capas translúcidas alrededor del botón, además de la sombra, para que el resplandor se vea también en Android, donde `shadowColor` no pinta como en iOS.
- **Fuera el mensaje duplicado bajo «Mi actividad»**: repetía el mismo aviso de ubicación que la tarjeta superior.

Pruebas del mapa actualizadas: la de GPS desactivado comprueba el botón de centrar y el texto de espera; la de timeout, que no queda ningún indicador girando. 96 pruebas de lógica y 171 de interfaz, `tsc` limpio y `eslint` 0 errores.

## Coma decimal, errores legibles, pausa real y biblioteca normalizada — 03/11/2026 (0.1.23)

Seis mejoras sobre la versión probada en el POCO.

- **Coma decimal**: `src/format.ts` añade `decimal(valor, dígitos)`, que usa `.toFixed()` y sustituye el punto por coma. Aplicado en Inicio, actividad, resultados, grabación (velocidad y diferencia), biblioteca, tarjetas, perfil, análisis premium, simulador y ajustes de controles. Las coordenadas siguen con punto, que es su convención.
- **Herramientas de prueba fuera de release**: «Herramientas de prueba», «Abrir simulador» y el acceso rápido del inicio quedan detrás de `__DEV__`. En un APK de usuarios ya no aparecen.
- **Errores legibles**: `src/errors.ts` traduce fallos técnicos (SQLite, espacio, permisos, red) a mensajes en español. Los mensajes que ya escribe la app se muestran tal cual y el texto original solo aparece como «Detalle técnico» en la pantalla de datos ilegibles.
- **Pausa real de la grabación**: botón «Pausar»/«Reanudar» junto a «Guardar y salir». Mientras dura la pausa no se guardan posiciones y el cronómetro se detiene (`run.pausedAt`). Al reanudar, la línea de tiempo se desplaza lo que duró la pausa —`startedAt`, `circuitStartedAt`, `lastFixAt`, todas las posiciones, el estado de comparación y el aviso— para que la pausa no cuente como tiempo ni deje un hueco de GPS que marque el intento como interrumpido.
- **Biblioteca normalizada**: el historial deja de ser una sola fila JSON. Cada ruta vive en una fila de la tabla `runs` con una firma barata; al guardar solo se reescriben las rutas que cambiaron y se borran las retiradas, todo en la misma transacción que el resto del estado. La lectura reutiliza los objetos ya interpretados mientras la firma no cambie y devuelve el mismo array cuando nada ha cambiado. Migración automática desde la fila antigua, idempotente, con reintento si falla y conservando la fila original hasta que la copia está hecha. La copia de recuperación sigue guardando el historial completo en el momento del checkpoint.
- **Cancelar con confirmación**: al cerrar una ruta en curso ahora se pregunta «¿Cancelar la ruta?» con «Seguir grabando» y «Sí, cancelar», en lugar del ambiguo «Cancelar / Guardar y salir» que se podía tocar por accidente al desbloquear el móvil. El recorrido sigue guardándose en pendientes.

Validación: 96 pruebas de lógica y 171 de interfaz, `tsc --noEmit` limpio y `eslint` 0 errores. Las pruebas de almacenamiento comprueban ahora la corrupción sobre la tabla `runs` y la recuperación desde la copia.

## Modo automático más tolerante — 02/11/2026 (0.1.22)

El cierre automático exigía aparcar a menos de 30–150 m del punto B y quedarse quieto dentro de un radio de 5–15 m, así que aparcar en una calle lateral o pasarse de la meta dejaba la ruta abierta. Ahora:

- **Zona de meta** (`destinationRadius`): 15 % de la longitud de la ruta, con un mínimo de 60 m y un máximo de 150 m (antes 20 %, mínimo 30 m).
- **Haber llegado al final cuenta**: si la proyección alcanza los últimos 30 m del trazado, se acepta el cierre aunque se haya aparcado más allá de B, con un margen lateral de 250 m para absorber el aparcamiento o la calle de al lado.
- **Parada**: se considera detenido hasta 1,5 m/s (5 km/h), que cubre el ruido del GPS parado y el paso lento al aparcar, y el ancla de estabilidad sube a 8–25 m según la precisión.
- **Espera**: 3 s en lugar de 5 s.
- **Entrada a la ruta**: el emparejamiento con el trazado pasa de 30 a 45 m de margen (80 m en la salida), para que el cronómetro arranque al incorporarse aunque la calle sea ancha o el GPS tenga ruido.

Sigue sin cerrarse la ruta si te detienes **antes** de la meta (200 m antes no cuenta) ni por pasar por la zona sin parar; ambas cosas tienen prueba. Añadida: aparcar 200 m después de la meta sí cierra. 96 pruebas de lógica y 171 de interfaz.

Límite conocido: si aparcas en un garaje sin cobertura, dejan de llegar posiciones y el cierre automático no tiene con qué decidir. En ese caso queda el botón «Finalizar ruta».

## Ajustes tras la primera prueba en el POCO F5 — 02/11/2026 (0.1.21)

Cambios pedidos después de usar la 0.1.19 en el móvil, todos para ganar espacio y quitar cosas que tapaban el mapa.

- **Inicio**: fuera la cabecera con el fantasma y el logotipo, y fuera el saludo de dos líneas. La pantalla empieza directamente por la tarjeta de ubicación, que ya es pulsable y lleva al estado del GPS. El botón de GPS de la cabecera desaparecía con ella y duplicaba esa tarjeta.
- **Grabación**: la cabecera pierde también el fantasma y el logotipo; queda el chevron para volver y la etiqueta «EN RUTA». El mapa pasa de 0,9 a 0,62 de reparto y el panel de 1,25 a 1,95, y `RecordingPanel` ya no repite el nombre y el modo en su cabecera. El velocímetro baja de 232 a 200 px. Con eso el reloj, la diferencia y las métricas quedan a la vista sin desplazar.
- **Mapa**: los controles «Mi ubicación» y «Ruta completa», que eran dos botones grandes sobre el mapa, pasan a dos botones redondos de 44 px en la esquina inferior derecha. La tarjeta de estado, que ocupaba el ancho del mapa, se convierte en una franja de una línea **debajo** del mapa, que ya no tapa nada. La atribución de OpenStreetMap se mueve a la esquina inferior izquierda para no chocar. En la grabación, el aviso de control o de entrada se reduce a una línea en la parte inferior del mapa en lugar de una tarjeta con dos textos y la referencia.
- **Márgenes**: el contenedor general baja de 20 a 16 px de relleno y de 16 a 12 px de separación; también se reduce el aire superior de Inicio.
- **Métrica de velocidad media**: el valor ya no lleva la unidad dentro (se cortaba en pantallas estrechas); la unidad pasa a la etiqueta, que ahora dice «Vel. media · km/h».
- **Capa de arranque**: si los datos fallaban al cargar, la cortina de marca podía quedarse encima de la app. Ahora también se retira cuando hay error de lectura y tiene un límite de 6 s como red de seguridad.

Pruebas actualizadas a los nuevos anclajes: las de Inicio comprueban la tarjeta «Ubicación actual» en vez del saludo eliminado, y las del mapa usan las nuevas etiquetas. 171 pruebas de interfaz y 95 de lógica, `tsc` limpio y `eslint` 0 errores.

## Rediseño visual según el mockup — 02/11/2026 (sin APK)

Primera pasada del diseño neón morado sobre las pantallas existentes, con la composición del mockup y no solo la paleta, que ya coincidía.

- **Tipografía propia**: Poppins (Regular, Medium, SemiBold, Bold, ExtraBold) en `assets/fonts`, cargada en `src/app/_layout.tsx` con `useFonts` de `expo-font`. Cada peso se registra como familia independiente (`src/fonts.ts`): en Android, combinar `fontFamily` con un `fontWeight` que la familia no contiene devuelve la tipografía del sistema, así que los estilos usan solo la familia. En pruebas no se cargan los binarios (el registro de assets de Jest no los resuelve).
- **Iconografía**: `@expo/vector-icons` (Ionicons) sustituye a los emojis en la barra inferior y en los accesos del inicio. Los tests usan un sustituto por `Text` mediante `moduleNameMapper` en `jest.config.js`; sin él, el registro de assets de Jest falla con «Module 1 is missing from the asset registry».
- **Inicio**: cabecera con el fantasma y un único botón de estado del GPS, saludo grande, tarjeta de ubicación compacta de una fila con estado en verde/ámbar, mapa, botón de deslizar para empezar, tres accesos rápidos (Mis rutas, Mi cuenta, Simulador) y la tarjeta de actividad con las tres cifras.
- **Navegación**: barra inferior de tres pestañas con iconos de línea y píldora activa. Se mantiene la decisión de no mostrar «Desafíos» ni «Eventos» mientras no existan como pantallas reales, aunque el mockup las dibuje: llevaban a una ruta sin pantalla.
- `CurrentLocation` (nombre del lugar por geocodificación inversa) se ha movido a la pantalla de estado del GPS, donde tiene espacio; en el inicio competía con el estado y se cortaba a 393 px.

Se añade `react-native-svg` para el indicador circular de la pantalla de ruta, pendiente en la siguiente pasada. Ese paquete y `@expo/vector-icons` obligan a compilar una APK nueva: no bastan los cambios de JavaScript.

Velocímetro (`src/SpeedGauge.tsx`): arco de 270° con degradado morado→rosa, halo tenue, cifra grande y unidad, colocado en la pantalla de grabación en lugar del número plano. El arco es solo escala visual: se llena según la velocidad instantánea respecto a un máximo orientativo por modo (130 km/h coche, 55 bici, 20 correr, 9 andar) y no limita ni filtra la grabación. En modo correr muestra el ritmo en min/km con la misma escala interna. Revisado a 393×851 con una ruta ficticia en una pantalla temporal, ya eliminada del árbol.

Perfil (`src/CreditsScreen.tsx`): la pantalla deja de ser solo el monedero. Cabecera con avatar (el fantasma), nombre de la cuenta y tres cifras reales —rutas, kilómetros recorridos y favoritas—, más un menú de tres filas: Premium, Ajustes de la app (abre los ajustes del sistema) y Ayuda (explica la grabación en segundo plano y dónde están las copias). Debajo se conservan el panel de cuenta, los créditos, el anuncio recompensado y el libro de movimientos, con sus textos y validaciones intactos. El distintivo «Miembro Premium» solo aparece cuando el servidor devuelve `premium: true`; si no, se indica «Cuenta gratuita» o «Sin sesión iniciada». La prueba de navegación pulsa ahora el botón «Volver a Inicio» (antes «← Inicio»), que pasó a ser un icono.

Tarjetas de ruta (`src/RouteCard.tsx`): la tarjeta de la biblioteca pasa a un componente propio con la composición del mockup —miniatura esquemática del trazado, modo, corazón de favorita, nombre, fecha, distancia y número de salidas, y el mejor tiempo con trofeo—, sin el pie duplicado que repetía el tiempo. Los emojis de corazón y corona se sustituyen por iconos. `km` y `date` se mueven a `src/format.ts` para compartirlos.

El chip «Récords» de la biblioteca ordenaba por **distancia**, no por récords: ahora usa una ordenación real por mejor tiempo (`order: 'best'` en `src/results.ts`), con las rutas sin referencia comparable al final.

Portada de bienvenida (`src/WelcomeScreen.tsx`): sustituye a la antigua pantalla «Acceso a GHOVO». Cielo con degradado, halo suave, estrellas y dos crestas de montaña dibujadas con SVG; fantasma, nombre GHOVO y lema «Rutas, récords y mucho más»; fila con los cuatro modos reales (andar, correr, bici, coche); botón «Comenzar» que abre el formulario de acceso en la propia app, botón «Iniciar sesión con Google» que usa el flujo nativo y un acceso provisional «Entrar sin registrarse» que entra sin cuenta.

Ese acceso sin cuenta es una bandera en memoria (`guestAccess`), no se guarda en disco y desaparece al reiniciar: está marcado como provisional en la propia interfaz y debe retirarse antes de publicar. El muro de acceso solo se salta con esa bandera.

Se elimina de `AccountPanel` la chapa «👑 Miembro Premium» que se mostraba a **cualquier** cuenta con sesión: el estado Premium solo lo conoce el servidor y ya se muestra en Perfil. El botón «⚡ Acceso rápido (Dev Local)» queda detrás de `__DEV__` para que no exista en compilaciones de release.

Pruebas nuevas en `tests/Welcome.ui.test.tsx`: la portada abre el acceso y el modo invitado, y un fallo de Google mantiene al usuario en la portada con un mensaje. Total: 171 pruebas de interfaz y 95 de lógica.

Validación: 169 pruebas de interfaz y 95 de lógica correctas, `tsc --noEmit` limpio y `eslint` 0 errores. Revisado a 393×851 mediante el inspector web (`tools/preview.mjs`), que mide desbordamiento horizontal y captura pantalla.

## Correcciones locales sobre 0.1.18 — saneamiento, 01/11/2026 (sin APK)

Revisión del árbol publicado como 0.1.18: `tsc --noEmit` fallaba (App.tsx, `act()` recibía `discard`, que devuelve `void`) y `expo lint` acumulaba 7 errores. Ambos quedan en cero: el helper `act()` acepta ahora `() => Promise<void> | void`; las cinco memorizaciones que bloqueaban `react-hooks/preserve-manual-memoization` se sustituyen por cálculo directo (React 19 las vuelve a memorizar cuando se active el compilador) y `RouteNameField` recibe el nombre inicial como función perezosa, sin leer una referencia durante el render.

Interfaz: el dock de grabación tenía dos acciones engañosas. El botón «Pausar grabación» llamaba a `discard()` y terminaba la sesión; el botón 📷 «Añadir hito» solo mostraba un aviso sin guardar nada. Ahora el dock expone una única acción explícita, «Guardar y salir», y la finalización sigue en el botón principal. Las pestañas «Desafíos» y «Eventos» y sus accesos en Inicio se retiran de la barra: no existían como rutas de Expo Router (`/challenges`, `/events`), el contenido era una maqueta que solo llevaba a Mis rutas y su única función realizable era mostrar una ruta sin pantalla. Siguen en la hoja de ruta para cuando tengan implementación y datos.

Configuración: se elimina `app.json`, que duplicaba los identificadores de AdMob ya declarados como propiedades del plugin en `app.config.ts`.

Tarjeta de ubicación de Inicio: contenía un pulsable dentro de otro (el botón «Consultar señal GPS» envolvía a `CurrentLocation`, también pulsable), lo que producía un `<button>` anidado, dos acciones superpuestas y texto cortado a 393 px. Ahora la tarjeta es el único destino táctil y `CurrentLocation` admite renderizarse sin interacción (`interactive={false}`) y sin la segunda línea de detalle. La prueba de interfaz que abría el estado del GPS pulsa la tarjeta en lugar del texto interno.

Validación: 95 pruebas de lógica y 169 de interfaz correctas, `tsc --noEmit` sin errores, `eslint` 0 errores y 16 avisos (todos `require()` deliberados en los mocks de pruebas), exportación Android del bundle JavaScript correcta. La generación de bytecode Hermes no se pudo comprobar en este entorno (el sandbox impide lanzar `hermesc`), así que queda pendiente la comprobación habitual antes de compilar. Sin cambios en adquisición GPS, esquema de datos ni permisos nativos.

## 0.1.15 (16) — Sistema de anuncios bonificados (Rewarded Ads) AdMob y créditos, 01/11/2026

Implementación del flujo de monetización voluntario basado en anuncios bonificados (Rewarded Video Ads): 1 anuncio visto completo = +1 crédito en la cuenta para gastar en rutas dentro de la app.
- **Integración nativa**: Configurado react-native-google-mobile-ads con los identificadores de prueba oficiales de Google AdMob (App ID ca-app-pub-3940256099942544~3347511713 y Rewarded Ad Unit ca-app-pub-3940256099942544/5224354917).
- **Control y seguridad de visualización**: src/ads.ts gestiona precarga, eventos LOADED, EARNED_REWARD, CLOSED y errores, con fallback seguro para entornos sin SDK nativo.
- **Interfaz en Tu cuenta**: Botón «Ver anuncio para conseguir 1 crédito» activado en CreditsScreen.tsx. El botón valida que la app esté en primer plano, el usuario esté detenido, sin ruta activa, con anuncios disponibles hoy (máximo 10 diarios) y saldo menor de 50.
- **Acreditación en servidor**: Conexión a la función RPC ghovo_claim_reward para insertar el movimiento en monetization.ledger (+1 crédito reward), actualizar la cuenta y refrescar el saldo automáticamente al completar la visualización.
- **Validación**: 94 pruebas de lógica + 169 pruebas de interfaz (263 pruebas totales), tsc --noEmit, expo lint y exportación Android Hermes superados con 0 errores.

## 0.1.14 (15) — Acceso nativo con Google (Google Play Services), 01/11/2026

Sustitución del flujo por navegador web externo por inicio de sesión nativo oficial con @react-native-google-signin/google-signin y signInWithIdToken de Supabase. El acceso se realiza directamente mediante la hoja modal nativa de Google Play Services en Android sin abrir pestañas de Chrome, sin riesgo de bloqueos por redirecciones 302 a esquemas personalizados ni dependencias de permisos de ventanas emergentes en capas de fabricantes (MIUI/HyperOS). En entornos sin servicios nativos o pruebas se mantiene el soporte alternativo seguro. Credencial de cliente OAuth Android configurada en Google Cloud con paquete app.ghovo.mobile y huella SHA-1 de la clave de firma EAS.

## 0.1.13 (14) — Inicio inmediato y activación del fantasma al entrar en el circuito, 31/10/2026

Inicio de ruta guardada sin esperas en primer plano: al pulsar «Estoy parado · iniciar», la grabación GPS y el servicio en segundo plano se activan de inmediato, permitiendo bloquear la pantalla o guardar el móvil. El fantasma y el cronómetro de la ruta permanecen en espera hasta que el usuario se incorpora físicamente al circuito marcado (routeEntry). En ese instante se registra circuitStartedAt, se activa el cálculo de diferencias en directo con la referencia y se emite un aviso por voz («Entrando en la ruta. Fantasma activado.»).

En la interfaz, mientras se acerca al circuito, el panel y el mapa informan de que la grabación está activa en dirección al circuito y de que el fantasma se activará al entrar. Al finalizar, la duración del circuito se contabiliza desde la entrada (circuitStartedAt) y la comparación (sameCourse) evalúa el tramo real recorrido sobre el circuito.

Validación: 94 pruebas de lógica + 164 pruebas de interfaz (258 pruebas totales), typecheck (tsc --noEmit), comprobación de tipos de pruebas (tsconfig.tests.json), lint (expo lint) y exportación bundle Android (Hermes) superados sin errores.

## 0.1.12 (13) — protección e incorporación a ruta, 27/10/2026

Inicio preparado de ruta guardada: con la app abierta espera a reconocer el camino y comienza el cronómetro al incorporarse, sin exigir cercanía a A. Puede reconocer dos posiciones precisas coherentes en movimiento; la espera fuera de la ruta no cuenta. Referencia/ghost alineados desde el punto de entrada; un tramo intermedio no sustituye récords completos. La detección se puede cancelar y se pausa si se cierra o bloquea la app antes del inicio; la grabación ya activa continúa en segundo plano como antes.

Llegada: cinco segundos parado/estable dentro de 50 m de B, utilizando velocidad nativa cuando está disponible y una zona de estabilidad. Pasar en coche no basta. Finalizar manualmente sigue disponible lejos de A/B. Voz, parada nativa del GPS y recuperación GPS no bloquean la cola de guardado ni impiden mostrar el resultado ya guardado.

Salir conserva ahora el intento en pendientes, de forma atómica, antes de liberar la grabación. Inicio permite recuperarlo sin perder puntos; no se limita el número de pendientes ni se borran los anteriores. No se han recuperado las dos rutas que el usuario ya descartó con una versión anterior.

Detalles, límites y comprobaciones en RECUPERACION-E-INICIO.md. Pruebas: 92 de lógica + 163 de interfaz, tipos y lint correctos. Exportación Android correcta antes de la última alineación de parches Expo; se repetirá la comprobación final antes de enviar a EAS. Prueba física pendiente.

## Corrección de llegada y finalización — 26/10/2026 (0.1.11 / 12)

Mensaje reproducido a partir del informe del usuario: el guardado manual rechazaba intentos que no superaban sameCourse y detenía el servicio GPS antes de validar o escribir. Ahora se guarda primero, en la transacción existente, y se detiene el servicio después. Una excepción al detener un servicio ya finalizado no se presenta como fallo de guardado. Los errores reales de escritura mantienen el borrador y el GPS para reintentar.

Radio de salida y llegada ampliado a 50 m. La comparación admite variaciones al aparcar en los extremos, conservando el emparejamiento estricto del interior. La llegada automática sigue requiriendo progreso en la ruta, una posición precisa y cinco segundos en la zona; ya no usa la coincidencia de toda la geometría como condición para guardar. Si el recorrido no es comparable, se guarda sin tiempo final comparado.

Finalizar ruta funciona fuera de la meta y sin exigir recuperar GPS reciente: conserva las posiciones disponibles y etiqueta el registro no comparable. No añade un control de meta ficticio ni sustituye la referencia. Nuevo atributo opcional incomplete compatible con registros anteriores, validación y copias de seguridad. Los registros sin al menos dos posiciones no se guardan como viaje terminado; el GPS no se detiene por esa validación. Sin cambios en adquisición GPS, mapa o permisos nativos, salvo el radio de salida y el manejo de guardado en tracking.ts.

## Paquete pendiente — Google y mapa fluido (25/10/2026)

Movimiento visual interpolado del marcador y fantasma, cámara con easeTo nativo en lugar de jumpTo en cada avance; sin extrapolar ni rellenar pérdidas GPS. Sin modificar grabación ni datos guardados. Acceso con Google implementado mediante navegador del sistema y PKCE S256; proyecto Google GHOVO creado y cliente creado por el usuario. Pendiente conectar la credencial en Supabase desde la cuenta con acceso a GHOVO (la sesión actual solo muestra TRUKA). Detalles en GOOGLE-Y-MAPA.md. 85 pruebas de lógica + 154 de interfaz, tipos/lint y exportación Android correctos. No se ha generado APK ni enviado OTA; requiere nuevo binario y prueba física.

Implementado el 22/10/2026. Mantener sin nueva compilación APK hasta que el usuario la solicite.

- Inicio con Nueva ruta visible y última actividad secundaria. No restaurar automáticamente el último resultado al abrir.
- Navegación Inicio / Mis rutas con Expo Router; estado de grabación compartido en el layout.
- Formulario sin mapa, comprobación de GPS precisa y reciente antes de habilitar Empezar. Revalidación nativa al iniciar; ubicación en segundo plano se solicita al iniciar, no en Inicio.
- Observador de preparación eliminado al salir o pasar a segundo plano; una posición vieja, imprecisa, futura o simulada no habilita la salida.
- Grabación interrumpida con Continuar / Descartar y sin borrar puntos. No reiniciar silenciosamente el servicio interrumpido detectado al arrancar.
- Aviso de pérdida GPS y confirmación breve al recuperar señal.
- Resultado con Ver recorrido / Volver a Inicio. En coche, mensajes neutros sin celebrar tiempos inferiores.
- Herramientas de prueba secundarias; simulador excluido de navegación final. Copias y opciones agrupadas en biblioteca.

Validación: 37 pruebas de lógica y 69 de interfaz, typecheck, lint, Expo doctor 20/20 y exportación Android/Hermes. La exportación no es una APK ni una prueba física. Vista web con datos y GPS de ejemplo; comprobar permisos, navegación nativa y recuperación en POCO F5 Pro en la próxima APK.

Dependencias Expo alineadas a sus correcciones compatibles. Auditoría npm tras la instalación: 49 avisos transitivos (18 moderados, 31 altos); no se aplicaron correcciones forzadas. Revisar antes de distribución pública.
## Puntos de control y llegada — 22/10/2026

Intervalo editable por ruta: 2, 5, 10, 20 o 50 km, además de desactivar puntos. Generación por distancia acumulada del trazado, interpolación de posición y exclusión de la meta; una ruta exacta de 20 km a intervalos de 5 km tiene 3 puntos. Un trazado con interrupciones no genera puntos de distancia inventada. Ajuste conservado en metadatos, copias y recuperación; no altera posiciones grabadas.

Marcadores en el mapa del recorrido y editor en su detalle. Mensaje final Felicidades, has llegado y diferencia respecto a la mejor referencia previa del mismo modo, identificada con fecha y duración. Sin comparación si no hay referencia o el intento tiene interrupciones conocidas. Es mensaje en pantalla al finalizar manualmente, no voz ni llegada automática.

Validación: 41 pruebas de lógica y 70 de interfaz (111), typecheck y lint. Falta detección de paso por puntos, comparación en directo y avisos sonoros: la colocación de puntos no implementa esas funciones por sí sola. Sin nueva APK.
## Comparación en directo y llegada — 22/10/2026

Este apartado sustituye el pendiente anterior de comparación al cruzar controles.

Implementado: rutas habituales compactas en Inicio con Iniciar y acceso al detalle; referencia por ruta (último viaje por defecto, mejor tiempo o viaje concreto), fijada por ID al iniciar. No mezcla modos conocidos; rutas antiguas sin referencia compatible pueden repetirse sin comparación. Editor de intervalo y preferencia de llegada automática conservados en copias.

La tarea nativa procesa cada posición aceptada, proyecta sobre un tramo cercano y ordenado de la referencia, conserva avance y parciales y oculta diferencias si el ajuste no es fiable. Los controles cruzados durante una interrupción se marcan sin tiempo estimado. El fantasma se reproduce en el mapa durante la grabación y la diferencia aparece como segundos más/menos en ese punto. Los parciales incluyen tiempo detenido.

Llegada automática en repeticiones: avance hasta los últimos 8 m de la referencia, posición a menos de 20 m de la meta con precisión de hasta 20 m, permanencia de 5 s y coincidencia del trazado completo. Guardado atómico de viaje/resultado y limpieza de borrador antes de detener GPS. Si falla el guardado, no se detiene el servicio ni se modifica el borrador persistido. Puede desactivarse; las rutas nuevas sin meta conocida se finalizan manualmente. Confirmación en pantalla; sin avisos sonoros aún.

Simulador: referencias más rápida/igual/más lenta, parciales y confirmación de llegada en memoria; nunca escribe rutas reales ni comprueba batería/permisos físicos. Vista previa utiliza datos ficticios.

Verificación: 47 pruebas de lógica y 75 de interfaz (122), comprobaciones de tipos de app y tests, lint y exportación Android/Hermes. Cubren selección por modo, paradas, pérdida de señal, controles sin tiempos inventados, necesidad de permanencia en meta, guardado en segundo plano, duplicados, fallo de disco y simulación. Falta prueba física de GPS y llegada en POCO. Sin nueva compilación APK.

## Avisos por voz y pantalla — versión 0.1.4

Avisos en español al cruzar controles y llegar a meta, con segundos más o menos respecto a la referencia. Aviso destacado en pantalla durante 12 segundos. Preferencia de voz por ruta y cambio durante la grabación, además de botón para probar el sonido. Sin tiempos inventados cuando falta una comparación fiable.

Los avisos se emiten después de guardar; posiciones duplicadas no repiten audio. Se descartan avisos antiguos y se evita acumular mensajes. Simulador con voz opcional; la vista web solo muestra el diseño.

Verificación: 50 pruebas de lógica y 82 de interfaz (132), tipos, lint, Expo doctor 20/20 y exportación Android/Hermes correctos. Pendiente comprobar volumen, voz española y funcionamiento con pantalla bloqueada en el POCO F5 Pro. APK 0.1.4 (5) enviada a compilación; consultar estado antes de darla por terminada.

## Corrección de preparación GPS y teclado — 22/10/2026

Tras informe físico: Nueva ruta busca GPS en la calle sin avanzar; editar nombre bloquea la pantalla. Causa del cierre nativo todavía sin confirmar: no hay registro Android del móvil conectado.

Cambios: búsqueda inicial limitada a 20 segundos con retirada del observador y reintento explícito; errores nativos atendidos; posiciones tardías ignoradas; observador que termina de registrarse después de salir se elimina. Al perder señal precisa se detiene la preparación y se permite reintentar. Preparación compartida con mapa de ruta guardada y suspendida durante el inicio para evitar observadores duplicados. Búsqueda sin ventanas automáticas de ajustes del proveedor Android. Teclado Android usa resize nativo sin aplicar simultáneamente KeyboardAvoidingView height.

Verificado: 87 pruebas de interfaz, incluidos timeout, error del proveedor, registro tardío, observador compartido y edición/navegación sin GPS. Comprobaciones físicas pendientes; pruebas con mocks no demuestran que el cierre nativo esté resuelto. Estos cambios no están incluidos en la APK 0.1.4 ya enviada.

Prueba de voz: se elimina el bloqueo previo por lista de voces vacía y se comprueba onStart/onError/onStopped del motor, con timeout de 8 segundos. Mensaje ya no atribuye el fallo a volumen o idioma sin evidencia. Cambio local, sin generar APK.

Barra de Android: contenedor nativo SafeAreaView en el layout raíz, con bordes inferior/laterales. Reserva el espacio real de navegación del sistema para todas las pantallas, incluido simulador y controles de grabación. Conserva el margen visual del contenido. No oculta los tres botones ni genera APK; pendiente prueba física con navegación de tres botones y gestos.

## Revisión GPS / Nueva ruta e Inicio desde cabecera — 22/10/2026

Inicio bloqueado hasta posición precisa (hasta 25 m) y reciente (hasta 15 s). Segunda adquisición al confirmar y comprobación adicional de permisos, GPS habilitado y antigüedad justo antes de guardar borrador. No crea ruta ni servicio al fallar adquisición o desactivarse el GPS. Pruebas del formulario con hook de preparación real y proveedor nativo simulado: editar nombre mientras busca, timeout, reintento, descarte de posiciones tardías, habilitar inicio tras fix preciso, nombre al iniciar y salir a Inicio sin arrancar GPS de grabación. Mantener pruebas físicas pendientes; no atribuir el cierre previo a una causa sin registros del móvil.

Fantasma y texto GHOVO comparten acceso accesible a Inicio. Durante una ruta muestra una tarjeta para volver; conserva el borrador y servicio, mantiene opción de pantalla encendida y no ofrece iniciar otra ruta simultánea. No cambia la biblioteca al navegar. Sin compilación APK ni publicación.

## Paquete 0.1.6 (7) — GPS y detalle de rutas

GPS: exige tres observaciones precisas, distintas y coherentes que cubran al menos dos segundos, al preparar y al confirmar. Duplicados, ráfagas, señal aproximada y saltos no habilitan inicio. Precisión estimada en metros; no garantiza el error real.

Recuperación: monitor cada 10 segundos en primer plano. Si el servicio se detiene o último fix supera 30 segundos, hasta tres intentos espaciados, sin solicitar permisos automáticamente ni perder puntos. Solo un fix válido confirma recuperación. Segundo plano depende del servicio nativo y Android; al volver se comprueba otra vez.

Diagnóstico: hasta 200 eventos locales (vista de 12), sin coordenadas ni nombres. Permisos, GPS apagado, imprecisión/saltos, timeout, proveedor y recuperación. Repetidos limitados; errores de diagnóstico no bloquean GPS.

Detalle reorganizado: título y pestañas Resumen / Ajustes / Viajes fuera del desplazamiento. Resumen compacto, mapa opcional, inicio fijo. Ajustes agrupa referencia, voz, controles, notas y gestión. Viajes muestra historial y reproducción opcional. Eliminado selector más/menos mapa del detalle. Incluye área segura Android, cabecera GHOVO a Inicio, corrección de teclado y prueba de voz real del motor.

Verificación: 52 pruebas de lógica y 104 de interfaz (156), tipos, lint, Expo doctor 20/20 y exportación Android/Hermes correctos. Resumen y Ajustes comprobados en vista previa con datos ficticios. Prueba física pendiente en POCO F5 Pro. No se ha implementado ajuste del trazado a la carretera.

Usuario autoriza expresamente enviar código fuente, imágenes y configuración a Expo/EAS, proyecto ghovo de skacristian, para compilar la APK. .env, pruebas, cachés, exportaciones y work excluidos por .easignore; no hay rutas del móvil en el proyecto.

APK 0.1.6 (7) terminada correctamente (FINISHED): https://expo.dev/accounts/skacristian/projects/ghovo/builds/40e463cf-26da-4564-bae0-e35083e3f3c6 . QR local: outputs/GHOVO-0.1.6-QR.png. Prueba física pendiente.

## Reestructuración tras prueba física de 0.1.6 — 22/10/2026 (solo código, sin APK)

El usuario informa GPS sin preparar, teclado parpadeante y mapa que oculta opciones. No hay registro nativo del cierre ni confirmación del proveedor GPS del móvil; no dar estos fallos por resueltos físicamente.

Navegación: AppProvider conserva estado por encima del Slot de Expo Router; cada ruta dibuja GhovoScreen dentro del contenedor activo. Se elimina la app dibujada en paralelo a Slot. Rutas /gps y /map reales. El mapa se abre con push y vuelve con back; no comparte el panel de opciones. Pruebas de una única pantalla/formulario y permanencia del mismo campo mientras llegan posiciones.

Nombre: componente independiente mantiene el texto local, nombre enviado al inicio mediante referencia estable; eliminado KeyboardAvoidingView del formulario Android. Nueva ruta: nombre, estado GPS y acción fija; sin mascota explicativa ni bloques secundarios repetidos.

Inicio mantiene su estructura con ubicación al lado de GHOVO. La localización se inicia al abrir la app en primer plano, compartida con Nueva ruta. Nombre de zona obtenido mediante geocodificador del móvil; si falla, coordenadas y precisión estimada. Nunca presenta una posición antigua como actual ni inventa una ciudad. No se registra el nombre/las coordenadas en el diagnóstico. Tocar ubicación abre estado GPS aun sin señal, con reintento, permisos y diagnóstico. Solo el inicio de grabación exige GPS, no consultar menús.

GPS: la ventana de estabilidad conserva hasta cinco muestras y permite alcanzar dos segundos aunque las actualizaciones lleguen a 999 ms. Descarta duplicados, separaciones excesivas e imprecisión. Reintento explícito puede solicitar activar el proveedor de alta precisión de Android; no se abre automáticamente mientras se escribe.

Detalle de rutas: Resumen sencillo con accesos directos a Ajustes, Historial y Mapa en pantallas separadas. Eliminadas pestañas y acción redundante Nueva ruta dentro de ajustes. Inicio y Mis rutas siguen disponibles cuando no hay grabación.

Verificación: 53 pruebas de lógica y 108 de interfaz (161), tipos de app/tests, lint y exportación Android/Hermes correctos. Vista web con datos ficticios: mapa abre y vuelve conservando opciones. Falta prueba física en POCO F5 Pro. No se ha enviado código a Expo ni generado APK de esta reestructuración.

Ajuste visual final: resumen compacto, referencia en una línea y botones Ajustes/Viajes en fila; Mapa e Iniciar visibles sin desplazar el resumen en la vista de 390×844. Verificado visualmente en la vista previa y 108 pruebas de interfaz vuelven a pasar. Captura: outputs/GHOVO-reestructura-vista.png. No se ha compilado APK nueva.

APK 0.1.7 (8) terminada correctamente (FINISHED), con la reestructuración de navegación, GPS en Inicio y formularios/mapa separados: https://expo.dev/accounts/skacristian/projects/ghovo/builds/c2b30799-9288-4b00-b19e-7f1a75481e34 . APK: https://expo.dev/artifacts/eas/YHri8w7RT7gHvTB_ymc4kdjsBeHHwsNWtfd3d15ayfo.apk . QR: outputs/GHOVO-0.1.7-QR.png. Prueba física de GPS/teclado/mapa pendiente en POCO F5 Pro.

## 0.1.8 (9) — bucle de permisos localizado por USB

El POCO confirma permisos precisos y ubicación activada. Registro de Android: GHOVO lanza REQUEST_PERMISSIONS cada 100–160 ms; la Activity de permisos interrumpe MainActivity. Al perder primer plano se cancela preparación GPS y al recuperarlo se vuelve a pedir permiso, repitiendo el ciclo. También se registra la retirada de la Activity coincidiendo con el cierre comunicado; no se observa una excepción fatal ni muerte del proceso en esa reproducción.

Corrección compartida: consultar antes de solicitar permisos, una sola solicitud pendiente, no repetir automáticamente tras volver a primer plano o denegar. Reintento explícito sigue disponible. Al comenzar grabación tampoco se solicita de nuevo el permiso de segundo plano si está concedido. Timeout de búsqueda incluye consultas de permisos bloqueadas. Se conserva el bloqueo de inicio sin GPS preciso y reciente.

Validación: 53 pruebas de lógica y 116 de interfaz (169), tipos de app y tests, lint correctos. Prueba que simula la Activity de permisos falla con la solicitud incondicional anterior y pasa con la corrección. Los tests con proveedores simulados no validan recepción física. Detalles en GPS-REGRESSION-0.1.7.md y RELEASE-0.1.8.md.

APK 0.1.8 enviada a Expo/EAS: https://expo.dev/accounts/skacristian/projects/ghovo/builds/81961c2c-a128-4a4e-89cc-7c730a663267 . Esperando compilación. No se instala por USB ni se borran datos del teléfono.


## Resumen de viajes y favoritas — 23/10/2026 (pendiente de APK)

Copia previa del código: outputs/GHOVO-0.1.8-base-antes-resumen-favoritos.zip. El usuario confirma tres rutas reales satisfactorias; no se identifica desde ese mensaje la versión instalada.

Favoritas: sección propia en Inicio, sin duplicarlas entre habituales y sin limitar a cuatro las favoritas. Añadir/quitar disponible en cabecera de detalle de ruta, visible sin entrar en Ajustes. Conserva el almacenamiento existente y el inicio ya implementado.

Viajes: acceso Ver detalles para cada intento del historial. Resumen conserva distancia, duración, comparación y tramos existentes; añade salida/llegada, modo, velocidad media incluyendo paradas, precisión GPS estimada e interrupciones. Media no disponible con cortes conocidos, discontinuidades geométricas, datos insuficientes o duración inválida. No se deducen paradas ni velocidades máximas a partir de ruido GPS.

Comprobado: 55 pruebas de lógica y 118 de interfaz (173), tipos de app/tests y lint correctos. Vista previa local revisada con datos ficticios: favoritas y detalles de un viaje. No se cambian captura GPS, permisos, servicio de grabación, esquema de datos ni puntos guardados. Cambios solo locales; no se genera otra APK.


## Información acumulada por ruta — 23/10/2026 (sin APK)

Bloque desplegable Información de la ruta situado después de los accesos principales, con número de viajes, tiempo habitual (mediana), mejor tiempo, kilómetros acumulados y fechas de primer/último viaje. Filtrado estricto por ruta y modo; borradores fuera. Cálculos de tiempo excluyen cortes y trazados insuficientes; distancia acumulada se etiqueta como registrada y potencialmente incompleta. No se modifica el GPS ni el almacenamiento.

Verificación: 57 pruebas de lógica y 119 de interfaz (176), tipos de app/tests y lint correctos; vista previa reconstruida. La vista previa utiliza datos ficticios. No se ha creado otra APK.


## Primer paquete premium — 24/10/2026 (sin APK)

Pantalla propia Análisis premium (/insights): periodos 7/30/90/todo, evolución mensual, mediana/P80 y regularidad, días y horarios, comparación entre viajes y controles comunes, planificación de salida con margen, alternativas de rutas guardadas con extremos próximos, estimación de combustible/coste e informe CSV del periodo sin coordenadas. Todas las funciones están abiertas para pruebas, sin activar compras ni límites de plan. Detalles y pendientes en PREMIUM-PAQUETE-1.md.

Validación final: 66 pruebas de lógica y 126 de interfaz (192), tipos de app y tests, lint correctos. Exportación Android/Hermes correcta en dist-premium-check. Comparación con copia previa confirma intactos GPS, permisos, grabación, core, almacenamiento, validación de datos y configuración nativa. La vista previa se ha reconstruido con historial ficticio; revisión visual pendiente porque el navegador bloqueó el acceso de automatización. Falta prueba física y no se genera otra APK.


## APK acumulada 0.1.9 (10) — 24/10/2026

El usuario solicita reunir las mejoras y crear APK. Incluye favoritas, resúmenes de viajes, información acumulada por ruta y primer paquete de análisis premium. Se conservan las funciones de 0.1.8. Versión incrementada a 0.1.9, código Android 10, misma firma remota y paquete.

Preflight repetido: 66 pruebas de lógica + 126 de interfaz = 192, tipos de app/tests y lint correctos. Fuente archivada en outputs/GHOVO-0.1.9-fuentes-2026-10-24.zip; copias ZIP organizadas fuera de la app y excluidas de futuros envíos EAS.

Build enviado con la autorización existente a Expo/EAS: https://expo.dev/accounts/skacristian/projects/ghovo/builds/54e97475-9bfa-4cda-8b40-290c9cb48071 . En compilación. No se instala automáticamente en el móvil.

APK 0.1.9 (10) terminada correctamente (FINISHED). Descarga comprobada HTTP 200: https://expo.dev/artifacts/eas/pEPvZwdAHdwgI38XEblRYLbQQPtpOrnNKezzxZ3LYlo.apk . QR local outputs/GHOVO-0.1.9-QR.png. Instalar como actualización sobre la versión existente. No se ha instalado automáticamente ni se han tocado datos del teléfono; prueba física pendiente.


## Monetización local — 25/10/2026

Nueva especificación: 3 créditos por cuenta confirmada, 1 por inicio correcto, máximo 50 sin caducidad; anuncios voluntarios con límite inicial 10/día y Premium de pago único previsto de 4,99 €. Sustituye propuestas anteriores de suscripción o límites de rutas guardadas.

Preparado backend independiente en ../ghovo-monetization con esquema privado Postgres, ledger, reservas idempotentes, verificación SSV de Google, compras verificadas pendientes de adaptador real y administración protegida. No se ha tocado el proyecto Supabase «My Project»: el usuario eligió preparación local.

App: acceso Créditos en navegación, pantallas Créditos/Premium y envoltorio de inicio/recuperación/liquidación con diario persistente. Monetización desactivada por defecto y URL sin configurar: los inicios usan directamente la grabación estable. No se han cambiado tracking.ts, location-permission.ts, core.ts ni storage.ts respecto a fuentes 0.1.9. No se han añadido SDK nativos ni generado APK.

Anuncios, compra y restauración permanecen deshabilitados explícitamente. No hay saldos inventados, pagos simulados ni activación remota. Faltan cuentas reales identificadas, SDK/consentimiento, pruebas SSV de consola, producto no consumible y verificación/revocación de tienda. Antes de activar, seguir README del backend; el precio previsto de administración no altera el precio de la tienda.

Validación: 75 pruebas de lógica, 130 de interfaz y 16 de backend (221). Tipos de app y pruebas, lint y exportación Android/Hermes correctos. Pruebas SQL en PGlite embebido: no sustituyen concurrencia multi-conexión Postgres ni pruebas físicas. Compilación local sin publicar.


## Base independiente GHOVO y permisos — 25/10/2026

Organización ghovo (Free), proyecto bzblxznukhkyqrpmqbni, separado de DesdeCasa/Truka. Esquema privado con nueve tablas y verificación de sesiones instalado. Las nueve tablas tienen RLS forzado; cero cuentas de prueba retenidas. Prueba SQL real de concesión, consumo y duplicado de créditos revertida al terminar. Ajuste adicional de permisos de la función automática RLS verificado: sin ejecución pública ni para clientes autenticados. Security Advisor: 0 errores, 0 avisos, 0 sugerencias.

La app sigue sin conectar al backend remoto: quedan sus credenciales mínimas y despliegue/configuración. No se han activado monetización ni proveedores reales, ni creado otra APK. Estado y pasos pendientes en ../ghovo-monetization/supabase-setup.json y README.md.

## Cuenta y créditos conectados — 25/10/2026

Pantalla Cuenta con registro, acceso, confirmación, recuperación y sesión cifrada; SDK Supabase real, SecureStore y Crypto nativos compatibles con Expo 58. API remota instalada y acceso limitado al propio usuario; administración requiere autorización explícita. Saldo e historial proceden del servidor. Tres créditos iniciales una sola vez. No se activa consumo obligatorio, publicidad o compra Premium.

Retorno de correo ghovo://auth/callback configurado. Falta SMTP propio para destinatarios públicos y prueba física del enlace, reinicio y recuperación. La APK actual no contiene los cambios: requieren un nuevo binario, todavía no generado ni publicado. Guía y estado en ../ghovo-monetization/CUENTAS-ESTADO.md. Los archivos de GPS y almacenamiento estable se conservan sin cambios.

Verificación: tipos de app/pruebas, lint y exportación Android/Hermes correctos; asesor remoto cero avisos y comprobación real de API anónima rechazada. Auditoría npm conserva seis avisos altos existentes en Expo/MapLibre/herramientas; no se aplican cambios incompatibles automáticamente.

Validación de cierre de este paquete: 80 pruebas de lógica, 148 de interfaz y 25 de backend (253); tipos de app y pruebas, lint y exportación Android/Hermes correctos. Suite completa de interfaz repetida tras los últimos ajustes. Comprobación binaria con la copia estable 0.1.9: tracking.ts, location-permission.ts, core.ts y storage.ts intactos. Copia de fuentes: ../GHOVO-cuentas-fuentes-2026-10-25.zip, sin dependencias instaladas, .env o binarios nativos. Falta prueba física con la próxima APK.

Validación de la corrección: 90 pruebas de lógica y 157 de interfaz acumuladas. La suite completa pasó con 156 y, tras añadir la regresión de llegada con desvío, pasaron las 60 pruebas de las dos suites afectadas. Tipos de app/pruebas, lint y exportación Android/Hermes correctos. Fuentes archivadas en ../GHOVO-0.1.11-fuentes-2026-10-26.zip. Prueba física pendiente.

APK 0.1.11 (12) enviada al mismo proyecto y con la misma firma remota. Build: https://expo.dev/accounts/skacristian/projects/ghovo/builds/2e8d93e6-f224-4000-8768-e48201b8214e . Estado inicial: IN_QUEUE. No se ha instalado automáticamente ni se han borrado rutas del móvil.

Prueba en POCO: iniciar a unos 40 m de A; llegar y permanecer cinco segundos a unos 40 m de B; verificar un único guardado. En otro intento, finalizar a más de 50 m de B: debe guardarse sin comparación final ni cambio de referencia. También comprobar finalización sin GPS reciente: se conservan las posiciones disponibles, con indicación no comparable. Instalar encima de la app actual, sin desinstalar.

Cierre de preparación 0.1.12: 92 pruebas de lógica + 163 de interfaz (255), tipos de app/pruebas y lint correctos. Expo Doctor 20/20 tras alinear los parches compatibles de hoy; exportación Android/Hermes correcta en ../ghovo-0.1.12-android-check. No se ha generado ni enviado otra APK en este turno. Los cambios requieren una nueva APK para llegar al teléfono. Fuentes: ../GHOVO-0.1.12-fuentes-2026-10-27.zip.
