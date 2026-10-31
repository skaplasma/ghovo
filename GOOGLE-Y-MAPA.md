# Google y movimiento del mapa — 25/10/2026

## Mapa

El seguimiento pasaba por Camera.jumpTo con cada posición y el marcador cambiaba directamente de coordenadas. Ahora la primera posición se centra inmediatamente y los avances normales usan Camera.easeTo nativo con transición lineal de 250–1.000 ms, ajustada al intervalo de las muestras. El marcador y el fantasma interpolan únicamente entre posiciones conocidas; sus componentes mantienen sus propios fotogramas, sin reconstruir la línea de ruta en cada fotograma.

No se predice dónde estará el coche. Si no llegan más posiciones, el marcador se detiene. Las muestras separadas por más de seis segundos, el tiempo invertido o desplazamientos mayores de 250 metros se recolocan directamente; no se representa un movimiento ficticio a través de una pérdida de señal. Al volver del segundo plano se toma la posición actual sin reproducir el movimiento ocurrido mientras estaba oculta.

Los datos guardados, distancias, tiempos, puntos de control y comparación siguen usando los datos originales. Los cambios solo afectan a RouteMap.tsx y a los nuevos módulos de presentación map-motion.ts/useDisplayPoint.ts. No se modifican tracking.ts, location-permission.ts, core.ts o storage.ts.

Pendiente: comprobar fluidez y carga en el POCO físico con la próxima APK. La animación no mejora por sí sola la cobertura o precisión del receptor GPS.

## Google

Botón Continuar con Google en Cuenta. Usa expo-web-browser 58.0.6 para la sesión de autenticación del sistema y Supabase con PKCE S256. Sin WebView, sin contraseña de Google introducida en GHOVO, sin solicitar permisos de Drive, Gmail u otros servicios. Cancelación y errores mantienen al usuario en la app. Cambios de cuenta bloqueados durante una grabación.

El SDK fijado 2.118.0 recibe experimental.appendPkceFlowIdToRedirects=true para identificar el verificador correcto incluso al volver por el enlace de Expo Router. Se valida el proveedor, origen exacto, ruta, retorno ghovo://auth/callback y sb_flow_id. Los tokens de sesión no se aceptan desde parámetros del enlace. El acceso sigue validándose con Auth.getUser y la API de créditos ya instalada.

Comprobación adicional con el SDK real, sin abrir sesión ni enviar correos: generación S256 y flujo incorporado correctamente a redirect_to, compatible con la validación de la app. Las pruebas de intercambio usan un proveedor simulado; el acceso real requiere completar la configuración remota y probar desde el móvil.

## Configuración externa

Proyecto Google Cloud exclusivo creado: GHOVO, ID ghovo-512722. Identidad OAuth creada con el correo de soporte/contacto autorizado por el usuario; público externo en modo de prueba. Política de datos aceptada con confirmación expresa. No se configura facturación ni Google Maps.

Cliente creado por el usuario y confirmado por el encabezado del diálogo de Google: tipo Aplicación web, nombre GHOVO · Supabase. Sin orígenes JavaScript añadidos. Único URI de retorno Google: https://bzblxznukhkyqrpmqbni.supabase.co/auth/v1/callback. El formulario web es correcto para el flujo OAuth que intermedia Supabase, aunque la app sea Android. No se ha leído ni guardado el secreto generado.

Configurar su ID y secreto en Google dentro de Authentication → Sign In / Providers del proyecto Supabase exclusivo GHOVO. Nunca poner el secreto en la app o en una variable EXPO_PUBLIC. Mantener comprobación de nonce y confirmación de correo; no usar opciones que omitan verificaciones. La activación del proveedor y el guardado de sus credenciales requiere intervención/autorización del usuario según la interfaz. No se ha activado el proveedor todavía. Al abrir GHOVO, la sesión actual del navegador redirige a la organización TRUKA y solo enumera esa organización: se ha pedido iniciar sesión con la cuenta de GHOVO, sin cambiar nada de TRUKA.

Revisar los usuarios de prueba de Google y autorizar la cuenta elegida para la prueba física. No publicar el consentimiento para todos los usuarios antes de completar los requisitos de Google. El registro por correo permanece preparado pero requiere SMTP para destinatarios públicos; Google no depende de ese envío.

No se genera ni publica APK u OTA. Crypto, SecureStore y WebBrowser requieren un nuevo binario cuando el usuario lo solicite.

Validación: 85 pruebas de lógica y 154 de interfaz (239 de app), tipos de app/pruebas y lint correctos; exportación Android/Hermes correcta en ../ghovo-google-motion-android-check. Verificación adicional del SDK real sin sesión ni envíos. No equivale a probar Google real o fluidez nativa en el POCO. Backend sin cambios en este paquete.

Fuentes: https://maplibre.org/maplibre-react-native/docs/components/camera/ ; https://docs.expo.dev/versions/v58.0.0/sdk/webbrowser/ ; https://supabase.com/docs/guides/auth/social-sign-in/auth-google .
