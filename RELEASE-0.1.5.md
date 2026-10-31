# GHOVO 0.1.5 (6)

Versión de prueba para investigar bloqueo en Nueva ruta antes de grabar, en POCO F5 Pro.

- Búsqueda GPS con límite y reintento explícito; limpieza en timeout, salida y error.
- Sin ventanas automáticas de ajustes de ubicación mientras se rellena el formulario.
- Sin observadores duplicados entre detalle de ruta y preparación/inicio.
- Teclado Android con redimensionado nativo, sin segundo ajuste de altura.

Verificación local: 87 pruebas de interfaz, tipos y lint correctos. La compilación en Expo no equivale a una prueba física.

Prueba pendiente: abrir Nueva ruta en la calle; escribir nombre mientras busca; esperar 20 segundos sin señal, comprobar mensaje y navegación; reintentar; comprobar inicio con señal precisa. Si la aplicación vuelve a cerrarse, obtener el registro Android del cierre antes de atribuir una causa o añadir más cambios.

Instalar como actualización de la versión anterior, sin desinstalar ni borrar datos.

Compilación enviada: https://expo.dev/accounts/skacristian/projects/ghovo/builds/617ca69f-27f2-4f90-9d5f-9b51f734a6e4 . Estado inicial NEW; no se ha confirmado que termine.
