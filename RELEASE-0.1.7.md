# GHOVO 0.1.7 (8)

Nueva estructura de navegación y pantallas: mapa independiente con regreso a la ruta, formulario de nombre con estado propio y GPS en Inicio. Estado y diagnóstico GPS accesibles sin señal. Resumen de ruta compacto con accesos Ajustes, Viajes y Mapa; inicio siempre visible.

GPS: corrección de la ventana de estabilidad para intervalos de actualización variables, búsqueda compartida desde Inicio y reintento explícito con proveedor Android. El nombre de la zona se obtiene del geocodificador del móvil; si no responde se muestran coordenadas recientes y precisión estimada.

Verificación: 53 pruebas de lógica y 108 de interfaz (161), tipos, lint y exportación Android/Hermes correctos. Falta confirmar físicamente que el teclado no parpadea y el GPS recibe posiciones en POCO F5 Pro. El simulador y la vista web no prueban estos comportamientos nativos.

Instalar como actualización sin desinstalar la anterior. Probar primero estando parado: Inicio localiza; abrir Estado GPS incluso sin señal; escribir nombre en Nueva ruta; verificar bloqueo de inicio sin señal; abrir mapa de una ruta guardada y volver; comprobar controles Android.

Compilación solicitada por el usuario. Se reutiliza su autorización explícita para enviar código, imágenes y configuración a Expo/EAS, proyecto ghovo de skacristian, con exclusión de .env y datos del móvil.

Compilación enviada a Expo: https://expo.dev/accounts/skacristian/projects/ghovo/builds/c2b30799-9288-4b00-b19e-7f1a75481e34 . Estado inicial NEW, pendiente de confirmar resultado.

Compilación confirmada FINISHED. APK: https://expo.dev/artifacts/eas/YHri8w7RT7gHvTB_ymc4kdjsBeHHwsNWtfd3d15ayfo.apk
Versión 0.1.7 (8), firmada con la credencial Android existente. Prueba física pendiente.
