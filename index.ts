import './src/tracking';
import * as SplashScreen from 'expo-splash-screen';

// Sin esto la cortina nativa se retira en el primer fotograma de React y, en un móvil
// rápido, solo se ve un parpadeo. Se oculta cuando los datos ya están leídos (App.tsx).
void SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({duration: 350, fade: true});

import 'expo-router/entry';
