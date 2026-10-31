# Protección de grabaciones e inicio en el camino — 27/10/2026

Versión preparada 0.1.12 (13), misma app y firma. La APK instalada 0.1.11 no cambia al editar estos archivos.

## Guardar y conservar

- El guardado manual conserva los datos disponibles desde cualquier lugar; no depende de estar en A o B. Si el viaje no completa A→B, se guarda sin comparar el tiempo final o sustituir la referencia.
- Ni la respuesta de detener el GPS ni la voz mantienen bloqueada la cola de almacenamiento o la pantalla de guardado. La recuperación del GPS también realiza las llamadas nativas fuera de esa cola y comprueba que el mismo intento sigue activo antes de escribir, para no resucitar una grabación ya guardada.
- «Guardar para más tarde» escribe de forma atómica todos los puntos en pendingRecordings antes de liberar el intento activo. Inicio ofrece recuperar cada pendiente para continuar o finalizar. No se eliminan automáticamente los pendientes antiguos al añadir otro.
- Recuperar mantiene el ID, la hora inicial y los puntos originales. La interrupción se incluye en el tiempo; si se reanuda con pérdida GPS se mantiene la advertencia de falta de comparabilidad. La lista de pendientes es local y no se incorpora al archivo de exportación de viajes completados.
- Esta mejora protege los próximos intentos. No se han recuperado las dos rutas que el usuario descartó en la versión anterior; no se ha accedido a la base del teléfono para buscar restos.

## Repetir una ruta guardada

Se prepara la detección estando parado. Con GHOVO abierta, el cronómetro empieza cuando el GPS preciso reconoce el trazado; no exige estar a 50 m de A. Se puede cancelar la espera. La pantalla permanece encendida si esa opción está activada. La detección pendiente se pausa al pasar a segundo plano; la grabación ya iniciada sigue usando el servicio de fondo existente.

Para detectar el camino en movimiento se aceptan dos observaciones precisas y coherentes, sin exigir que el coche permanezca en el mismo sitio. No se acumula tiempo mientras espera fuera de la ruta. Se admite un radio de 50 m junto a A y de 30 m respecto al interior del trazado; no se inicia si quedan menos de 50 m hasta el final. En cruces se elige la coincidencia temprana más próxima; aún requiere prueba física en caminos paralelos o cruces repetidos.

Si la incorporación es intermedia, referenceOffsetMs alinea el fantasma y la comparación en directo con el punto de entrada. Ese viaje se conserva como tramo y no compite con el mejor tiempo completo A→B. Los nuevos datos opcionales son compatibles con las grabaciones y copias anteriores.

## Llegada automática

Requiere progreso suficiente, GPS reciente con precisión de hasta 25 m, distancia al final de hasta 50 m y cinco segundos estable en la zona. La velocidad nativa, cuando está disponible, debe ser como máximo 0,8 m/s; además el punto debe permanecer dentro de una pequeña zona estable. Sin dato de velocidad se utiliza esa estabilidad de las posiciones. Pasar conduciendo cerca de B no basta. Si no hay señal suficiente, sigue disponible el guardado manual.

## Comprobaciones

92 pruebas de lógica y 163 de interfaz correctas; tipos de app/pruebas y lint correctos. Cubren inicio dentro del camino, espera fuera del camino, inicio con observaciones en movimiento, incorporación de referencia, llegada detenida frente a paso en coche, guardado aunque la respuesta nativa no termine, conservación y recuperación desde Inicio. Falta prueba física en el POCO. Los parches compatibles de Expo preparados en el turno anterior se incluyen en este paquete.

Cierre de preparación 0.1.12: 92 pruebas de lógica + 163 de interfaz (255), tipos de app/pruebas y lint correctos. Expo Doctor 20/20 tras alinear los parches compatibles de hoy; exportación Android/Hermes correcta en ../ghovo-0.1.12-android-check. No se ha generado ni enviado otra APK en este turno. Los cambios requieren una nueva APK para llegar al teléfono. Fuentes: ../GHOVO-0.1.12-fuentes-2026-10-27.zip.
