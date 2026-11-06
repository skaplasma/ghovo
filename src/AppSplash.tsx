import React, {useEffect, useState} from 'react';
import { t as tr } from './i18n-core';
import {Animated, Easing, Image, View} from 'react-native';
import {palette} from './design';

// Capa de arranque de marca. La cortina nativa solo existe en arranque en frío y se
// retira al primer fotograma; esta capa cubre el hueco, evita el salto entre la
// cortina y la app y garantiza que la imagen de GHOVO se vea siempre.
export function AppSplash({ready}: {ready: boolean}) {
  const [fade] = useState(() => new Animated.Value(1));
  const [minimumShown, setMinimumShown] = useState(false);
  const [removed, setRemoved] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinimumShown(true), 650);
    // Red de seguridad: la capa nunca debe quedarse tapando la app si los datos fallan.
    const failsafe = setTimeout(() => setRemoved(true), 6000);
    return () => {
      clearTimeout(timer);
      clearTimeout(failsafe);
    };
  }, []);

  useEffect(() => {
    if (!ready || !minimumShown || removed) return;
    Animated.timing(fade, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => setRemoved(true));
  }, [ready, minimumShown, removed, fade]);

  if (removed) return null;

  return <Animated.View
    pointerEvents="none"
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: palette.background, alignItems: 'center', justifyContent: 'center', opacity: fade}}
  >
    <View style={{width: 120, height: 120, borderRadius: 34, backgroundColor: '#211B3C', borderWidth: 2, borderColor: '#6A0DAD', alignItems: 'center', justifyContent: 'center'}}>
      <Image source={require('../assets/ghovo-logo-3d-v1.png')} style={{width: 114, height: 114}} resizeMode="contain" accessible={false} />
    </View>
  </Animated.View>;
}
