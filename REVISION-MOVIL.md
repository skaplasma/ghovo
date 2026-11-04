# Revisión antes de enviar a Play Console

Lo que ya está comprobado de forma automática y lo que solo se puede verificar en el móvil.

## Comprobado automáticamente

- `tsc --noEmit` sin errores.
- `eslint` con 0 errores.
- **97 pruebas de lógica**: GPS, comparación, llegada, entrada a la ruta, guardado, copias, almacén.
- **179 pruebas de interfaz**: inicio, grabación, biblioteca, perfil, privacidad, anuncios, borrado de cuenta, mapa.
- **Auditoría de Play** (`node tools/play-check.mjs`): 23 comprobaciones correctas, 5 avisos —todos tareas externas— y 0 fallos.

## Lo que hay que probar en el móvil

Instala el APK de previsualización y recorre esta lista en orden. Si algo falla, apunta en qué paso y qué viste.

### Cuenta y portada

- [ ] La portada abre con el fantasma y «GHOVO», sin el logo cortado.
- [ ] «Iniciar sesión con Google» entra sin abrir el navegador.
- [ ] Con la sesión iniciada, al reabrir la app no vuelve a pedir cuenta.
- [ ] «Entrar sin registrarse» **no** aparece (solo con `EXPO_PUBLIC_GUEST_ACCESS=1`).

### Biblioteca y migración

- [ ] Tus rutas de la versión anterior siguen ahí después de actualizar.
- [ ] Abrir una ruta muestra sus intentos y el mejor tiempo.
- [ ] Los kilómetros salen con coma («2,60 km»), no con punto.

### Grabación

- [ ] Iniciar ruta estando lejos del trazado: el panel dice «Esperando…» y el fantasma **no** se mueve.
- [ ] Al entrar en el trazado: «Confirmando…» y, con la siguiente posición, arranca el fantasma **en el punto de entrada**.
- [ ] Bloquear el móvil 2-3 minutos y desbloquear: el tiempo no se ha perdido y las posiciones siguen.
- [ ] Pausar, esperar un minuto, reanudar: el cronómetro no ha contado la pausa y el recorrido sigue.
- [ ] La velocidad y la diferencia con el fantasma caben en una línea sin cortarse.

### Llegada y guardado

- [ ] Llegar a destino y **aparcar a un lado** (no justo en B): la ruta se cierra sola en unos segundos.
- [ ] El resumen dice un tiempo y una comparación, no «sin comparación fiable».
- [ ] Terminar a mano a mitad de ruta: se guarda, pero marcado como no comparable.
- [ ] La ruta aparece en la biblioteca con su mejor tiempo actualizado.

### Perfil y privacidad

- [ ] «Privacidad» abre el resumen y el botón lleva a la política completa.
- [ ] «Batería sin restricciones» abre la lista del sistema; marcar GHOVO y comprobar que sigue grabando con la pantalla apagada.
- [ ] «Opciones de privacidad» abre el formulario de consentimiento de anuncios.
- [ ] «Eliminar mi cuenta» pide confirmación; si el SQL no está pegado en Supabase, muestra un error **sin** borrar nada del móvil.

### Anuncios

- [ ] Con consentimiento dado, el botón de ver anuncio se habilita y suma 1 crédito al terminar el vídeo.
- [ ] Sin consentimiento, el botón está deshabilitado y aparece «Opciones de privacidad».
- [ ] Con una ruta activa, el botón está deshabilitado y se explica por qué.

## Antes de generar el `.aab` de tienda

- [ ] Pegar `supabase/borrado-de-cuenta.sql` en Supabase y probar el borrado real con una cuenta de prueba.
- [ ] Publicar `PRIVACIDAD.md` en la URL y comprobar que abre.
- [ ] Capturas de pantalla (mínimo dos) hechas desde el móvil.
- [ ] Decidir los IDs de AdMob: si aún no hay cuenta, el primer envío puede ir con los de prueba **solo para la revisión interna**, nunca como versión pública.
- [ ] Crear la cuenta de revisión de Play y anotar sus credenciales.

## Si todo lo anterior pasa

```sh
npx eas-cli@latest build --platform android --profile production
```

Genera el `.aab` con `versionCode` incrementado automáticamente. Ese archivo es el que se sube a la pista interna de Play Console.
