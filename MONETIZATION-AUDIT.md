# Auditoría de monetización — 25/10/2026

Especificación nueva: tres créditos iniciales por cuenta verificada, hasta 50 acumulados sin caducidad, un crédito por inicio correcto, diez recompensas al día y Premium no consumible de pago único previsto de 4,99 €. Sustituye las propuestas anteriores de suscripción o límite de tres rutas guardadas. Las funciones existentes no se recortan.

## Situación comprobada

- Expo 58.0.17, React Native 0.88, Expo Router y SQLite local. No hay autenticación, backend de aplicación, monedero, SDK de anuncios o compras ni configuración de tiendas.
- La cuenta Expo/EAS compila APK internas; no proporciona por sí sola cuentas de GHOVO, saldo o validación de pagos.
- El conector Supabase muestra un proyecto «My Project» sin vínculo comprobado con GHOVO. Se pregunta al usuario si es de pruebas; no se modifica ese proyecto sin identificarlo.
- startTracking valida servicios/permisos, obtiene GPS preciso, guarda un borrador y arranca el servicio nativo. Si el servicio falla, elimina solo ese borrador. resumeTracking recupera el mismo registro. El final se guarda en una transacción SQLite. No se debe cargar un crédito al tocar Nueva ruta ni al preparar el GPS.

## Integración viable

Backend PostgreSQL separado, probado localmente con un motor PostgreSQL WASM; identidad Supabase verificada en servidor, no un user_id enviado por el cliente. Saldo, libro de movimientos e idempotencia en servidor. La app no crea un saldo local ni concede Premium desde un booleano del cliente.

Inicio distribuido: reservar saldo por identificador de recorrido, iniciar servicio nativo y confirmar consumo una sola vez después del éxito. Una confirmación de resultado desconocido se reconcilia usando el mismo identificador; no se vuelve a cobrar. Un fallo previo al inicio cancela la reserva; no consume crédito. Una ruta iniciada puede reanudarse sin volver a autorizar crédito. Los nuevos inicios offline no se habilitan en esta fase: hacerlo de forma segura exige pases previamente emitidos y protección adicional contra doble gasto entre dispositivos. Las rutas ya activas no se detienen por pérdida de red.

## Proveedores investigados y límites antes de añadir SDK nativos

- Anuncios: react-native-google-mobile-ads/AdMob permite configuración Expo mediante plugin y necesita otra compilación nativa. Requiere aplicación y unidades AdMob reales, consentimiento UMP/CMP aplicable y verificación SSV de la firma Google en servidor. El callback del cliente no aumenta saldo.
- Compras: Expo documenta expo-iap y react-native-purchases. Un producto no consumible de Google Play es adecuado para el pago único Android. Se necesitan cuenta Play Console, producto publicado para pruebas, identidad de cuenta vinculada, verificación de purchaseToken, reconocimiento y tratamiento de anulaciones. La APK interna de EAS por sí sola no demuestra una compra real de Google Play. iOS requiere configuración equivalente de App Store.
- El precio mostrado al comprar debe venir de la tienda. El importe administrativo de 4,99 € es orientativo hasta configurar el producto; modificarlo no modifica automáticamente la tarifa de Google/Apple.
- No se instalan ni activan anuncios/compras nativos mientras falten sus cuentas, productos, consentimiento y configuración verificables. No se publica en producción ni se cobra dinero en esta fase.

Fuentes: https://docs.expo.dev/guides/in-app-purchases/ ; https://docs.page/invertase/react-native-google-mobile-ads ; https://developers.google.com/admob/android/ssv ; https://developer.android.com/google/play/billing/security . La comprobación técnica no constituye una certificación de cumplimiento normativo.
