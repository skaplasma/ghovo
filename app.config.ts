import { ExpoConfig } from 'expo/config';
// Una variable vacía en .env llega como cadena vacía, no como undefined: con ?? se colaría
// un App ID de AdMob en blanco y la app se cerraría al arrancar. Aquí se trata como ausente.
const env=(value:string|undefined,fallback:string)=>value&&value.trim().length?value.trim():fallback;
// IDs reales por entorno; sin ellos se usan los de prueba de Google para poder probar el flujo.
const admobAndroid = env(process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID, 'ca-app-pub-3940256099942544~3347511713');
const admobIos = env(process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID, 'ca-app-pub-3940256099942544~1458002511');
const config:ExpoConfig={
  name:'GHOVO', slug:'ghovo', owner:'skacristian',
  extra:{eas:{projectId:'72f2347a-dad7-4daf-a387-8bb1ea0408be'}},
  version:'0.1.32', icon:'./assets/ghovo-icon-3d.png',
  scheme:'ghovo', orientation:'portrait', userInterfaceStyle:'dark',
  android:{
    package:'app.ghovo.mobile', versionCode:33, allowBackup:false, softwareKeyboardLayoutMode:'resize',
    blockedPermissions:['android.permission.READ_EXTERNAL_STORAGE','android.permission.WRITE_EXTERNAL_STORAGE'],
    adaptiveIcon:{foregroundImage:'./assets/ghovo-adaptive-3d.png',backgroundColor:'#101C22'},
  },
  plugins:[
    ['expo-build-properties',{
      android:{
        extraProguardRules:'-keep class androidx.work.impl.WorkDatabase { *; }\n-keep class androidx.work.impl.WorkDatabase_Impl { *; }\n-keep class * extends androidx.room.RoomDatabase\n-keep @androidx.room.Entity class *\n-dontwarn androidx.work.impl.**\n-keep class com.google.android.gms.ads.** { *; }',
      },
    }],
    ['react-native-google-mobile-ads',{
      androidAppId:admobAndroid,
      iosAppId:admobIos,
      delayAppMeasurementInit:true,
    }],
    '@react-native-google-signin/google-signin','expo-router','expo-sharing','expo-status-bar','expo-secure-store','expo-web-browser',
    ['expo-location',{isAndroidBackgroundLocationEnabled:true,isAndroidForegroundServiceEnabled:true}],
    'expo-sqlite', '@maplibre/maplibre-react-native',
    ['expo-splash-screen',{
      // Imagen con margen: Android 12 recorta el icono de arranque en un círculo y el
      // fantasma a sangre se veía cortado por los lados.
      image:'./assets/ghovo-splash-3d.png',
      imageWidth:220, resizeMode:'contain', backgroundColor:'#101C22',
      dark:{image:'./assets/ghovo-splash-3d.png',backgroundColor:'#101C22'},
    }],
  ],
};
export default config;
