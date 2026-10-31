import { ExpoConfig } from 'expo/config';
const config:ExpoConfig={
  name:'GHOVO', slug:'ghovo', owner:'skacristian',
  extra:{eas:{projectId:'72f2347a-dad7-4daf-a387-8bb1ea0408be'}},
  version:'0.1.14', icon:'./assets/ghovo-2d-icon-v1.png',
  scheme:'ghovo', orientation:'portrait', userInterfaceStyle:'dark',
  android:{
    package:'app.ghovo.mobile', versionCode:15, allowBackup:false, softwareKeyboardLayoutMode:'resize',
    blockedPermissions:['android.permission.READ_EXTERNAL_STORAGE','android.permission.WRITE_EXTERNAL_STORAGE'],
    adaptiveIcon:{foregroundImage:'./assets/ghovo-2d-adaptive-v1.png',backgroundColor:'#101C22'},
  },
  plugins:[
    '@react-native-google-signin/google-signin','expo-router','expo-sharing','expo-status-bar','expo-secure-store','expo-web-browser',
    ['expo-location',{isAndroidBackgroundLocationEnabled:true,isAndroidForegroundServiceEnabled:true}],
    'expo-sqlite', '@maplibre/maplibre-react-native',
    ['expo-splash-screen',{
      image:'./assets/ghovo-mascot-2d-v1.png',
      imageWidth:200, resizeMode:'contain', backgroundColor:'#101C22',
      dark:{image:'./assets/ghovo-mascot-2d-v1.png',backgroundColor:'#101C22'},
    }],
  ],
};
export default config;






