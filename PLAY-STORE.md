# GHOVO en Google Play — paquete de publicación

Documento de trabajo para la primera subida. Lo que ya está en el repositorio, lo que hay que hacer en la consola y los textos listos para pegar.

## 1. Lo que ya está listo

- **Icono de ficha**: `store/icon-512.png` (512×512, sin transparencia).
- **Gráfico destacado**: `store/feature-graphic-1024x500.png` (1024×500, sin transparencia).
- **Perfil `production`** en `eas.json`: genera `.aab`, `distribution: store` y `autoIncrement`, que sube el `versionCode` en cada compilación para que Play no rechace una subida repetida.
- **`expo-dev-client` movido a `devDependencies`**: el menú de desarrollo ya no viaja en la compilación de tienda.
- **Borrado de cuenta** dentro de la app (Perfil → Eliminar mi cuenta) y `supabase/borrado-de-cuenta.sql`.
- **Política de privacidad** redactada en `PRIVACIDAD.md`.
- **Consentimiento de anuncios (UMP)** y anuncios con IDs configurables por entorno.
- **Acceso invitado desactivado**: el botón «Entrar sin registrarse» solo aparece con `EXPO_PUBLIC_GUEST_ACCESS=1`. En la compilación de tienda no existe.
- **Herramientas de prueba y simulador** ocultos fuera de desarrollo.

## 2. Lo que falta y no es código

1. Cuenta de Google Play Console (25 $ una vez) y verificación de identidad.
2. **Prueba cerrada con 12 testers durante 14 días** si la cuenta es personal y nueva: es requisito para pedir acceso a producción.
3. Publicar la política de privacidad en una URL pública (GitHub Pages sirve).
4. **Capturas de pantalla**: mínimo 2, entre 320 y 3840 px por lado. Hay que hacerlas desde el móvil; las mejores para la ficha: portada, grabación en curso, mis rutas y perfil.
5. Pegar el SQL de borrado de cuenta en Supabase.

## 3. Ficha de la tienda

**Nombre** (máx. 30): `GHOVO`

**Descripción corta** (máx. 80 caracteres):

```
Graba tus rutas y corre contra tu fantasma: tu mejor tiempo, otra vez.
```

**Descripción completa** (máx. 4000):

```
GHOVO graba tus recorridos y los convierte en un rival: tu fantasma. Cada ruta que guardas se queda con su trazado y su mejor tiempo, y la próxima vez puedes correr contra ella y ver, punto a punto, si vas por delante o por detrás.

CÓMO FUNCIONA
· Elige coche, bici, corriendo o a pie y empieza a grabar.
· GHOVO guarda tu recorrido aunque bloquees el móvil.
· Al llegar, la ruta se cierra sola y se convierte en tu referencia.
· La próxima vez, el fantasma sale en el mismo punto en el que entras al circuito y cuenta tu tiempo desde ahí.

MIENTRAS GRABAS
· Velocidad o ritmo, distancia, tiempo y media, en una sola línea.
· Diferencia con tu fantasma en segundos, en verde si ganas y en rojo si pierdes.
· Pausa cuando quieras: lo pausado no cuenta.
· Mapa con tu trazado, tus puntos A y B y tu posición.

DESPUÉS
· Biblioteca con tus rutas, favoritas, notas y búsqueda.
· Comparación de intentos, mejor tiempo y evolución.
· Análisis por franjas horarias, días de la semana y estimación de combustible en coche.
· Exportación de tus recorridos a GPX y copia de seguridad en JSON.

TU CUENTA
· Tus rutas y tus créditos se guardan en tu cuenta para no perderlos al cambiar de móvil.
· Puedes eliminar tu cuenta y tus datos desde la propia app, en Perfil.

SOBRE LA UBICACIÓN
GHOVO usa la ubicación precisa y, durante la grabación, también en segundo plano: es lo que permite seguir registrando el recorrido con la pantalla apagada. Sin ese permiso la app funciona, pero solo graba con la pantalla encendida.

SIN SORPRESAS
· No hay cuentas ni sincronización con servidores propios de rutas: el trazado se queda en tu móvil salvo que tú lo exportes.
· Los anuncios son voluntarios: ves uno si quieres un crédito, nunca durante la grabación.
```

**Categoría**: Salud y bienestar, o Mapas y navegación. Recomendada: *Salud y bienestar* (deporte), secundaria *Estilo de vida*.

**Etiquetas**: `running`, `cycling`, `rutas`, `GPS`.

**Correo de contacto**: cristianmartinezweb@gmail.com

**Política de privacidad**: URL pública con el contenido de `PRIVACIDAD.md`.

## 4. Declaración de anuncios

- ¿La app contiene anuncios? **Sí**.
- Tipo: anuncios recompensados (vídeo) que el usuario decide ver.
- Con consentimiento previo (UMP) y opción de cambiar la elección en Perfil → Opciones de privacidad.

## 5. Seguridad de los datos (Data safety)

| Dato | ¿Se recoge? | ¿Se comparte? | Finalidad | Notas |
|---|---|---|---|---|
| Correo electrónico | Sí | No | Cuenta y acceso | Supabase. Borrado disponible en la app. |
| Ubicación aproximada | Sí | No | Funcionalidad | Deriva de la precisa; no se sube el trazado. |
| Ubicación precisa | Sí | No | Funcionalidad | Se guarda en el móvil; no se envía a servidores propios. |
| Actividad en la app (rutas) | Sí, en el dispositivo | No | Funcionalidad | El usuario puede exportarla. |
| Identificadores del dispositivo | Sí (por AdMob) | Sí (Google) | Publicidad | Solo al ver un anuncio recompensado. |
| Diagnóstico | Sí, limitado | No | Analítica de fallos | Sin coordenadas ni nombres. |

- **Cifrado en tránsito**: sí (HTTPS).
- **Eliminación de datos**: el usuario puede pedir el borrado en la app y por correo. Hay que indicar en el formulario la URL con el procedimiento.
- **Datos de menores**: la app no está dirigida a menores de 14 años.

## 6. Permiso de ubicación en segundo plano

Play exige una declaración aparte para `ACCESS_BACKGROUND_LOCATION`. Justificación para pegar:

```
GHOVO graba recorridos deportivos y de conducción. La grabación debe continuar con la
pantalla apagada y el móvil guardado, porque el usuario conduce o corre y no puede mirar
la pantalla. Sin ubicación en segundo plano, el recorrido se corta al bloquear el móvil y
la función principal de la app (comparar el recorrido con el fantasma) deja de ser fiable.

El permiso se pide solo al empezar una grabación, nunca al abrir la app. Mientras graba,
la app mantiene un servicio en primer plano con notificación visible. El usuario puede
detener la grabación en cualquier momento desde la notificación o desde la app.

La ubicación no se comparte con terceros ni se usa para publicidad. El trazado se guarda
en el dispositivo y solo sale de él si el usuario exporta una copia.
```

Si en la consola piden un vídeo, basta una grabación de pantalla de 30 s: iniciar ruta, bloquear, desbloquear y finalizar.

## 7. Acceso a la app para revisión

La app exige cuenta. En «Acceso a la app» hay que marcar que se necesita inicio de sesión y **dar credenciales de prueba**:

- Crear una cuenta de revisión (por ejemplo `review@ghovo.app` con contraseña larga).
- Escribirla en la sección de instrucciones junto con: «Inicia sesión con el correo y la contraseña indicados. La app abre directamente en Inicio; pulsa Comenzar ruta para grabar. No hace falta completar una ruta para revisar la app.»

Si esa cuenta lleva Premium o créditos, indicarlo también.

## 8. Clasificación de contenido

- Violencia, sexo, drogas, apuestas: no.
- Compras dentro de la app: sí (créditos y Premium previsto).
- Ubicación compartida con terceros: no.
- Clasificación esperada: apta para todos los públicos (PEGI 3), con las salvedades de compras y anuncios.

## 9. Compilar y subir

```sh
# .aab firmado para la tienda
npx eas-cli@latest build --platform android --profile production

# subida automática a la pista interna (requiere el primer envío manual o `eas submit`)
npx eas-cli@latest submit --platform android --profile production
```

El primer envío suele hacerse subiendo el `.aab` a mano en la consola para crear la versión; a partir de ahí `eas submit` funciona.

**Antes de compilar**:

- Confirmar que `EXPO_PUBLIC_GUEST_ACCESS` no está definida (sin invitado).
- Confirmar que no hay IDs de prueba de AdMob en la compilación de tienda: definir `EXPO_PUBLIC_ADMOB_*` si ya existen, o dejar los de prueba y sustituirlos en la siguiente compilación tras crear la cuenta de AdMob.
- Comprobar `app.config.ts`: `version` y `versionCode` coherentes con la ficha.

## 10. Después de publicar

- [ ] Pegar el SQL de borrado de cuenta en Supabase y probar el flujo completo.
- [ ] Crear la app y la unidad recompensada en AdMob con la app ya publicada.
- [ ] Sustituir los IDs por variables de entorno y compilar de nuevo.
- [ ] Verificar la atribución de OpenStreetMap y, si el uso crece, pasar a un proveedor de teselas propio.
- [ ] Implementar la verificación SSV de recompensas en el servidor.
