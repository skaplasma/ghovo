# Compilar el APK en GitHub

EAS agotó las compilaciones gratuitas del mes, así que el APK se genera en GitHub Actions
con minutos gratuitos. No hay que instalar nada en el ordenador.

## Cómo lanzarlo

1. Abre el repositorio en GitHub: `github.com/skaplasma/ghovo`.
2. Entra en la pestaña **Actions**.
3. A la izquierda, elige **APK Android**.
4. Pulsa **Run workflow** (arriba a la derecha del todo). Deja el campo de rama vacío.
5. Espera. La primera vez tarda unos 15-20 minutos porque descarga Gradle y compila las
   partes nativas (mapa, GPS, anuncios). Las siguientes son más rápidas.
6. Cuando termine, entra en el run y descarga **Artifacts → GHOVO-0.1.31-…**. Es un ZIP
   con el APK dentro.

## Qué hace exactamente

- Instala Node 20 y Java 17.
- `npm ci` para las dependencias.
- Copia `.env.example` a `.env`: los valores públicos de Supabase ya están ahí, así que la
  app arranca con la cuenta configurada y los anuncios de prueba.
- `npx expo prebuild` genera la carpeta `android/` a partir de `app.config.ts`.
- `./gradlew assembleRelease` compila el APK con el JavaScript empaquetado dentro.

## Lo que tienes que saber

- **Firma**: el APK va firmado con la clave de depuración, que se genera en cada
  compilación. Sirve para instalar y probar, pero **no para Google Play** y, al cambiar de
  compilación, puede pedirte desinstalar la anterior.
- **Play** sigue necesitando un `.aab` firmado con una clave propia. Cuando llegue el
  momento, hay dos caminos: volver a EAS el mes que viene, o añadir aquí la clave de
  verdad.
- **Cuota**: los repos privados tienen 2.000 minutos al mes gratis; un APK consume unos
  15-20. Con el repo público es ilimitado.
- Si un paso falla, el log dice en cuál. Lo habitual la primera vez es que falte alguna
  plataforma del SDK de Android; se arregla añadiendo un `npx expo install` con la versión
  que pida el error.

## Para más adelante: firmar con la clave de verdad

Cuando quieras APK de release actualizables (y el `.aab` de Play), hay que:

1. Generar un keystore una sola vez: `keytool -genkeypair -v -keystore ghovo-release.jks
   -alias ghovo -keyalg RSA -keysize 2048 -validity 10000`.
2. Guardarlo en GitHub como secretos: `ANDROID_KEYSTORE_BASE64` (el archivo en base64),
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
3. Añadir al workflow un paso que lo decodifique y configure `signingConfigs.release`.

Ese keystore no se puede perder: sin él no se pueden publicar actualizaciones de la app.
