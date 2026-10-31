# Cambios posteriores a la prueba del POCO F5 Pro

El usuario comunicó uso en coche, rectas entre puntos y pérdida de registro al bloquear la pantalla. Solicitó simulador y mantener la pantalla encendida con posibilidad de apagarla. La APK no se ha actualizado.

## Implementado localmente

- Modo coche con filtro de movimiento distinto del peatonal y solicitud de ubicación cada segundo. Modo conservado en base de datos y copias. Los resultados no comparan coche con caminatas ni con modos antiguos desconocidos.
- El mapa y GPX separan intervalos de más de 15 segundos con movimiento superior a 20 m. No se suma ese salto a la distancia ni se interpola un fantasma en medio del tramo desconocido. No se ha implementado ajuste a carreteras ni reconstrucción de posiciones perdidas.
- Al regresar al primer plano se comprueba y trata de reanudar el servicio de una grabación pendiente usando permisos ya concedidos. Un servicio activo no se reinicia. Sigue pendiente la prueba con suspensión real de Android y restricciones de MIUI/HyperOS.
- Pantalla activa por defecto mientras se graba con la app visible. Interruptor para recuperar apagado automático; cambiarlo no detiene el registro. Se libera la solicitud de pantalla encendida al terminar o salir al fondo. No se impide bloqueo físico.
- Simulador en cabecera, sin GPS ni escrituras: circuito ficticio, pausa, avance manual, velocidades 1/5/10, señal buena/imprecisa/ausente y bloqueo visual simulado que conserva la ejecución en memoria. No reproduce suspensión real del proceso ni permisos del fabricante. Las teselas pueden necesitar conexión.
- Botón fijo de grabar/finalizar/crear ruta, opciones agrupadas y diagnóstico de servicio/antigüedad de la última posición válida. No se etiqueta como ausencia total de GPS lo que puede ser señal imprecisa rechazada.

## Verificación

Pruebas de lógica para conducción, saltos imposibles, señal débil, interrupción sin líneas/distancia/GPX ficticios y copia del modo. Pruebas de interfaz para pausa del simulador, continuidad durante bloqueo virtual, recuperación tras pérdida y pantalla activa opcional sin detener grabación. Pruebas de servicio para recuperación al desbloquear y no reiniciar un servicio sano.

La validación de TypeScript, lint, Expo Doctor y exportación local Android no sustituye una prueba física. No se ha generado ni publicado ninguna APK. El archivo VERIFICATION-2026-10-21.md describe el punto de control anterior a este paquete, no estos últimos cambios.

Referencias consultadas: [Expo Location 58](https://docs.expo.dev/versions/v58.0.0/sdk/location/), [Expo KeepAwake 58](https://docs.expo.dev/versions/v58.0.0/sdk/keep-awake/), [gestión de permisos MIUI](https://trust.mi.com/docs/miui-privacy-white-paper-global/3/1).
