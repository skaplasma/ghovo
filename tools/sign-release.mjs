// Configura la firma de release con el keystore del proyecto cuando está disponible en el
// entorno: GHOVO_KEYSTORE (ruta), GHOVO_KEYSTORE_PASSWORD, GHOVO_KEY_ALIAS, GHOVO_KEY_PASSWORD.
// Sin esas variables no hace nada y el build sigue usando la firma de depuración.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const gradleFile = path.join(root, 'android/app/build.gradle');
const storeFile = process.env.GHOVO_KEYSTORE;
if (!storeFile || !fs.existsSync(storeFile)) {
  console.log('Sin keystore propio: se compila con la firma de depuración.');
  process.exit(0);
}

const gradle = fs.readFileSync(gradleFile, 'utf8');
if (gradle.includes('GHOVO_RELEASE_SIGNING')) {
  console.log('La firma de release ya estaba configurada.');
  process.exit(0);
}

const block = `
// GHOVO_RELEASE_SIGNING: bloque añadido por tools/sign-release.mjs
android {
    signingConfigs {
        release {
            storeFile file('${storeFile.replace(/\\/g, '/')}')
            storePassword System.getenv('GHOVO_KEYSTORE_PASSWORD')
            keyAlias System.getenv('GHOVO_KEY_ALIAS')
            keyPassword System.getenv('GHOVO_KEY_PASSWORD')
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
`;

fs.appendFileSync(gradleFile, block);
console.log('Firma de release configurada con el keystore del proyecto.');
