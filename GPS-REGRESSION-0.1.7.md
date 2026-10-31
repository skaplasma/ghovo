# Regresión GPS / cierre — revisión de 0.1.7

Comparación realizada contra outputs/GHOVO-0.1.3-fuentes-2026-10-21.zip, conservando el ZIP intacto.

Hechos verificados:
- Antes: getFreshFix resolvía con la primera posición válida, reciente (15 s) y precisa (hasta 25 m).
- Ahora: tres posiciones distintas, coherentes y al menos dos segundos de separación total. Este requisito puede impedir iniciar aunque exista una posición utilizable.
- Antes: watchPositionAsync usaba el comportamiento por defecto de Android para resolver ajustes de alta precisión.
- Ahora: mayShowUserSettingsDialog:false en preparación, inicio y mapa impide esa resolución automática. Un reintento explícito intenta enableNetworkProviderAsync.
- Antes: la vista del mapa mostraba también ubicaciones aproximadas; ahora se distingue observedPoint de ready.
- Biblioteca expo-location: mismo rango ~58.0.18 en ambas copias; se añadieron Router, SafeArea, Speech y otros módulos. No atribuir el cierre a uno de ellos sin registro Android.

La comparación anterior identificaba posibilidades, no la causa. La inspección USB posterior sí permitió identificar un bucle de permisos.

## Evidencia física — POCO F5 Pro, 22/10/2026

Android confirma ubicación activada y permisos de ubicación precisa concedidos a GHOVO 0.1.7 (8). Entre 13:38:56 y 13:39:06, ActivityTaskManager registra solicitudes REQUEST_PERMISSIONS de GHOVO aproximadamente cada 100–160 ms. GrantPermissionsActivity queda repetidamente por encima de MainActivity. A las 13:39:06.255 registra Force remove immediately de la pantalla de GHOVO, coincidiendo con el cierre y el teclado parpadeante comunicados por el usuario. El proceso continúa vivo; no aparece una excepción fatal de Java/JavaScript en esta reproducción. No atribuir un crash de proceso al bucle sin más evidencia.

Cadena de código: useGpsPreparation llama requestForegroundPermissionsAsync incondicionalmente. La Activity de permisos cambia AppState, deshabilita la preparación y cancela su efecto. Al volver a active se vuelve a solicitar el permiso, incluso ya concedido, y se repite. Los tests anteriores simulaban el resultado del permiso pero no ese cambio de ciclo de vida de Android.

Corrección: consultar permisos antes de pedirlos; compartir una única solicitud pendiente; preparación solo puede pedirlos automáticamente una vez por montaje y puede volver a pedirlos por reintento explícito. Mapa y comienzo de grabación usan la misma comprobación. El permiso de segundo plano concedido tampoco se vuelve a solicitar al iniciar. El límite de búsqueda cubre también una consulta de permisos bloqueada. Sin cambios en los filtros de precisión, coordenadas, rutas guardadas ni ajuste estético a carretera.

Regresión: prueba de la pantalla Nueva ruta simula que una solicitud de permisos toma el foco y envía la app a background/active. Falla con la solicitud incondicional anterior (dos solicitudes) y pasa con la corrección. Se añaden pruebas de permiso concedido, denegación, reanudación, solicitud pendiente compartida y timeout de consulta.

Registros locales filtrados de GHOVO: work/device-diagnostics/ghovo-activity-log.txt y ghovo-reproduced-log.txt. No se han borrado datos ni instalado nada en el teléfono mediante USB. Queda pendiente validar la APK corregida físicamente.
