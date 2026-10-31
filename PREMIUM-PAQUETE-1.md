# GHOVO — primer paquete de análisis premium

24/10/2026. Cambios locales preparados para la próxima APK. Se prueban sin cobros ni límites de suscripción.

## Incorporado

- Pantalla /insights de Expo Router, accesible desde Análisis premium en el detalle de una ruta. Volver y navegación principal disponibles. No se abre durante una grabación.
- Filtros de 7, 30, 90 días y todo el historial. Solo viajes terminados de esa ruta y modo; se excluyen registros futuros. Los tiempos excluyen datos incompletos, cortes GPS y trazados insuficientes.
- Mediana, P80 histórico, rango observado y evolución mensual con tamaño de muestra visible. No se interpreta como predicción de tráfico.
- Análisis por día de la semana y franjas de salida de dos horas, según la zona horaria actual del móvil. Una franja solo se destaca con 3 viajes en 2 días distintos.
- Comparación de dos viajes elegibles: duración y distancia registrada. Tiempos acumulados en controles comunes solo si comparten referencia, distancia de control y tiempo de referencia. Los valores ausentes no se convierten en cero.
- Planificación de salida para hoy o mañana: llegada HH:MM, P80 del historial filtrado y margen adicional. Mínimo 3 viajes válidos en 2 días distintos. Comprueba horas inválidas, cambio de hora inexistente, llegada pasada y salida ya pasada. No agenda avisos ni consulta tráfico.
- Alternativas entre rutas guardadas del mismo modo y sentido, con extremos próximos a 150 m. No compara bucles ni recorridos con salida/llegada separadas menos de 300 m. Cada alternativa exige 3 viajes válidos en 2 días distintos. No calcula carreteras ni descubre rutas nuevas.
- Estimación de combustible y coste en euros a partir de kilómetros registrados y consumo/precio introducidos. Solo coche. Campos locales a la pantalla; no se mide consumo real ni se consultan precios.
- Informe CSV del periodo con nombre, fechas ISO, modo, duración, distancia, velocidad media estimada, precisión estimada y estado. Sin coordenadas del trazado. UTF-8 BOM, delimitadores y comillas escapados y protección de fórmulas en hojas de cálculo. Confirmación explícita en la app antes de abrir el menú nativo para guardar/compartir. No hay envíos automáticos.

## Conservación del funcionamiento

Copia previa: outputs/GHOVO-base-antes-premium-2026-10-24.zip. Comparación binaria confirma sin cambios src/tracking.ts, src/useGpsPreparation.ts, src/location-permission.ts, src/core.ts, src/storage.ts, src/state-validation.ts y app.config.ts. Sin dependencias ni permisos nuevos, cambios de esquema o solicitudes de ubicación añadidas.

Los cálculos se hacen en módulos puros sobre el historial existente. La pantalla conserva sus propios formularios y no añade temporizadores de actualización GPS. Actualizar análisis renueva la fecha de corte de forma explícita.

Vista previa: se añaden viajes ficticios para inspeccionar las tendencias; nunca se usa el historial del teléfono. El navegador bloqueó el acceso de automatización a la vista previa; la revisión visual queda pendiente. Las pruebas de interfaz no sustituyen una prueba física.

## Pendiente de otros paquetes

- Sincronización y copias en la nube: requieren backend, cuentas y consentimiento específico para subir trazados.
- Compras, suscripción y control real de acceso gratuito/premium. No se activa un falso desbloqueo local ni se restringe esta versión de pruebas.
- Compartir/importar fantasmas y GPX entrantes, organización por carpetas/etiquetas y mapa de demoras. La exportación GPX y las copias JSON existentes se conservan.
- El modo bici sigue pendiente como trabajo independiente de captura y validación; no se simula usando coche o a pie.

No se genera ni publica otra APK en este paquete.

Validación final: 66 pruebas de lógica y 126 de interfaz (192), tipos de aplicación/tests y lint correctos. Exportación Android/Hermes correcta (dist-premium-check). Falta prueba física de esta interfaz y del menú nativo de compartir en el teléfono.
