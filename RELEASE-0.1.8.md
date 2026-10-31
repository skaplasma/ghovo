# GHOVO 0.1.8 (9)

Corrección del bucle de solicitudes de permiso de ubicación observado por USB en el POCO F5 Pro con 0.1.7. Android abría continuamente la Activity de permisos, interrumpiendo GPS y teclado.

Se consultan primero los permisos concedidos. Una única solicitud pendiente se comparte entre consumidores; volver a primer plano no vuelve a solicitar el permiso automáticamente. Denegaciones y falta de respuesta terminan con un estado accesible y reintento explícito. Mapa y comienzo de grabación utilizan la misma comprobación. No se cambia la validación de precisión ni se borran rutas.

Prueba de regresión reproduce la pérdida de foco provocada por el permiso: falla con la solicitud anterior y pasa con la corrección. La validación física de la nueva APK sigue pendiente: abrir Inicio, Nueva ruta, escribir un nombre, comprobar ubicación real y después grabar una ruta a salvo. Un resultado de tests con GPS simulado no confirma recepción real del teléfono.

Validación local: 53 pruebas de lógica, 116 de interfaz (169 en total), tipos de la app y los tests, lint correctos.

Compilación: https://expo.dev/accounts/skacristian/projects/ghovo/builds/81961c2c-a128-4a4e-89cc-7c730a663267
