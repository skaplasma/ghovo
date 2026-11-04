import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const pngSize = (file) => {
  const buffer = fs.readFileSync(path.join(root, file));
  return {width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20)};
};

const checks = [];
const check = (ok, label, detail) => checks.push({ok, label, detail});
const warn = (label, detail) => checks.push({ok: 'warn', label, detail});

const pkg = JSON.parse(read('package.json'));
const app = read('app.config.ts');
const eas = JSON.parse(read('eas.json'));

// Configuración de la app
check(/version:'0\.\d+\.\d+'/.test(app), 'Version definida en app.config.ts', /version:'([^']+)'/.exec(app)?.[1]);
check(/versionCode:\d+/.test(app), 'versionCode definido', /versionCode:(\d+)/.exec(app)?.[1]);
check(app.includes("package:'app.ghovo.mobile'"), 'Package Android', 'app.ghovo.mobile');
check(app.includes('allowBackup:false'), 'Copia automática de Android desactivada', 'allowBackup:false');
check(app.includes('blockedPermissions'), 'Permisos de almacenamiento general bloqueados', 'READ/WRITE_EXTERNAL_STORAGE');
check(app.includes('react-native-google-mobile-ads'), 'Plugin de AdMob configurado', 'react-native-google-mobile-ads');
check(app.includes('expo-location'), 'Plugin de ubicación con servicio en primer plano', 'isAndroidForegroundServiceEnabled');
check(app.includes('expo-build-properties'), 'Reglas de ProGuard para AdMob', 'expo-build-properties');

// Compilación de tienda
check(eas.build?.production?.android?.buildType === 'app-bundle', 'Perfil production genera .aab', 'app-bundle');
check(eas.build?.production?.distribution === 'store', 'Distribución de tienda', 'store');
check(eas.build?.production?.autoIncrement === true, 'versionCode automático', 'autoIncrement');
check(!pkg.dependencies['expo-dev-client'], 'expo-dev-client fuera del APK de tienda', pkg.devDependencies['expo-dev-client'] ? 'en devDependencies' : 'ausente');

// Recursos de ficha
for (const [file, expected] of [['store/icon-512.png', {width: 512, height: 512}], ['store/feature-graphic-1024x500.png', {width: 1024, height: 500}]]) {
  if (!exists(file)) { check(false, `Recurso ${file}`, 'no existe'); continue; }
  const size = pngSize(file);
  check(size.width === expected.width && size.height === expected.height, `Recurso ${file}`, `${size.width}×${size.height}`);
}
check(exists('assets/ghovo-2d-icon-v1.png'), 'Icono de la app', 'assets/ghovo-2d-icon-v1.png');
check(exists('assets/ghovo-splash-v1.png'), 'Imagen de arranque', 'assets/ghovo-splash-v1.png');

// Requisitos de Play
check(exists('PRIVACIDAD.md'), 'Política de privacidad redactada', 'PRIVACIDAD.md');
check(exists('src/PrivacyScreen.tsx'), 'Privacidad accesible en la app', 'src/PrivacyScreen.tsx');
check(read('src/account-client.ts').includes('ghovo_delete_account'), 'Borrado de cuenta en la app', 'RPC ghovo_delete_account');
check(exists('supabase/borrado-de-cuenta.sql'), 'SQL de borrado de cuenta', 'supabase/borrado-de-cuenta.sql');
check(exists('src/WelcomeScreen.tsx') && read('src/WelcomeScreen.tsx').includes("EXPO_PUBLIC_GUEST_ACCESS==='1'"), 'Acceso invitado solo con variable', 'desactivado por defecto');
check(read('src/ads.ts').includes('canRequestAds'), 'Consentimiento de anuncios antes de pedirlos', 'UMP');
check(exists('PLAY-STORE.md'), 'Guía de publicación', 'PLAY-STORE.md');

// Riesgos que hay que mirar a mano
const admobReal = /EXPO_PUBLIC_ADMOB_REWARDED_UNIT/.test(read('src/ads.ts'));
if (!process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT) {
  warn('IDs reales de AdMob', 'sin EXPO_PUBLIC_ADMOB_REWARDED_UNIT se usan los de prueba: válido para revisar, no para producción');
}
if (!process.env.EXPO_PUBLIC_PRIVACY_URL) {
  warn('URL de privacidad', 'sin EXPO_PUBLIC_PRIVACY_URL se usa la de GitHub Pages: comprobar que responde');
}
warn('SQL pegado en Supabase', 'comprobar que ghovo_delete_account existe antes de enviar');
warn('Cuenta de revisión', 'Play necesita usuario y contraseña de prueba (ver PLAY-STORE.md)');
warn('Capturas de pantalla', 'mínimo dos, hechas desde el móvil');

const failed = checks.filter(item => item.ok === false);
const warned = checks.filter(item => item.ok === 'warn');
for (const item of checks) {
  const mark = item.ok === true ? 'OK  ' : item.ok === 'warn' ? 'AVISO' : 'FALLO';
  console.log(`${mark}  ${item.label}${item.detail ? ` → ${item.detail}` : ''}`);
}
console.log(`\n${checks.length - failed.length - warned.length} correctos, ${warned.length} avisos, ${failed.length} fallos.`);
process.exit(failed.length ? 1 : 0);
