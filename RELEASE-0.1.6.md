# GHOVO 0.1.6 (7) — prueba en POCO F5 Pro

Incluye el paquete completo de GPS, voz, teclado, área segura de Android, acceso a Inicio desde GHOVO y detalle de rutas con Resumen / Ajustes / Viajes. Mapa opcional, controles de inicio fijos. Las posiciones originales no se ajustan a carreteras.

Comprobaciones locales: 52 pruebas de lógica y 104 de interfaz; tipos, lint, Expo doctor 20/20 y exportación Android/Hermes correctos. Esto no confirma el funcionamiento físico del GPS ni que el cierre anterior esté resuelto.

Prueba estando parado:
1. Instalar sobre la versión actual, sin borrar datos ni desinstalar.
2. Nueva ruta: escribir nombre mientras busca. No puede iniciar sin tres posiciones precisas y coherentes; muestra precisión estimada y estabilidad.
3. GPS apagado: inicio bloqueado, información clara y posibilidad de volver a Inicio. Reintentar al activarlo.
4. Ruta guardada: Resumen / Ajustes / Viajes con acceso directo, mapa opcional e inicio visible.
5. Probar voz; si falla, probar el ejemplo de Android en Texto a voz. La app no puede detectar el volumen multimedia mediante esta prueba.
6. Grabación: comprobar precisión, posiciones y regreso desde Inicio sin detenerla. Si falla señal, consultar diagnóstico GPS en Opciones y ayuda.
7. Pantalla bloqueada: comprobar físicamente que sigue guardando y recupera al volver. La recuperación automática del monitor funciona en primer plano; en segundo plano depende del servicio Android y restricciones del móvil.
8. Verificar que el menú inferior queda por encima de los tres botones Android.

Diagnóstico GPS solo local: últimos 200 eventos, sin coordenadas ni nombres. No se envía automáticamente a terceros.

Compilación confirmada FINISHED: https://expo.dev/accounts/skacristian/projects/ghovo/builds/40e463cf-26da-4564-bae0-e35083e3f3c6
APK: https://expo.dev/artifacts/eas/KA-o0yO4SSEo2BRKMjKI0SADsr4NujN-z7RRcHqBHLU.apk
Firmada con la credencial Android existente; versión 0.1.6 (7).
