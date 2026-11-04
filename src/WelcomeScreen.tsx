import React, {useState} from 'react';
import {Image, Pressable, ScrollView, Text, View} from 'react-native';
import {StatusBar} from 'expo-status-bar';
import {Ionicons} from '@expo/vector-icons';
import Svg, {Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop} from 'react-native-svg';
import {palette} from './design';
import {fonts} from './fonts';
import {accountError, loginWithGoogle} from './account-client';

const MODES = [
  {icon: 'walk', label: 'Andar'},
  {icon: 'fitness', label: 'Correr'},
  {icon: 'bicycle', label: 'Bici'},
  {icon: 'car-sport', label: 'Coche'},
] as const;

function Hero() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 393 851" preserveAspectRatio="xMidYMid slice" style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}}>
      <Defs>
        <LinearGradient id="gskSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#1A1033" />
          <Stop offset="0.55" stopColor="#150E2C" />
          <Stop offset="1" stopColor="#0B0920" />
        </LinearGradient>
        <RadialGradient id="gskSun" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#9D4EDD" stopOpacity="0.55" />
          <Stop offset="0.55" stopColor="#9D4EDD" stopOpacity="0.16" />
          <Stop offset="1" stopColor="#9D4EDD" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="gskBase" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0B0920" stopOpacity="0" />
          <Stop offset="0.55" stopColor="#0B0920" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#0B0920" stopOpacity="0.9" />
        </LinearGradient>
      </Defs>
      <Rect width="393" height="851" fill="url(#gskSky)" />
      <Circle cx="300" cy="430" r="175" fill="url(#gskSun)" />
      <Circle cx="86" cy="250" r="1.8" fill="#FFFFFF" fillOpacity="0.5" />
      <Circle cx="152" cy="330" r="1.4" fill="#FFFFFF" fillOpacity="0.35" />
      <Circle cx="330" cy="230" r="2.1" fill="#FFFFFF" fillOpacity="0.45" />
      <Circle cx="238" cy="180" r="1.3" fill="#FFFFFF" fillOpacity="0.3" />
      <Path d="M0 851 L0 648 L70 566 L138 640 L196 590 L266 668 L318 626 L393 690 L393 851 Z" fill="#2A1D52" />
      <Path d="M0 851 L0 726 L60 668 L130 730 L208 676 L288 740 L354 702 L393 730 L393 851 Z" fill="#17102F" />
      <Rect y="640" width="393" height="211" fill="url(#gskBase)" />
    </Svg>
  );
}

export function WelcomeScreen({onSignIn, onGuest}: {onSignIn: () => void; onGuest: () => void}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function google() {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await loginWithGoogle();
    } catch (error) {
      setMessage(accountError(error));
    } finally {
      setBusy(false);
    }
  }

  return <View style={{flex: 1, backgroundColor: palette.background}}>
    <StatusBar style="light" />
    <Hero />
    <ScrollView contentContainerStyle={{flexGrow: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 28, justifyContent: 'space-between'}}>
      <View style={{alignItems: 'center', gap: 16}}>
        <View style={{width: 92, height: 92, borderRadius: 28, backgroundColor: '#211B3C', borderWidth: 2, borderColor: '#6A0DAD', alignItems: 'center', justifyContent: 'center'}}>
          <Image source={require('../assets/ghovo-logo-3d-v1.png')} style={{width: 90, height: 90}} resizeMode="contain" accessible={false} />
        </View>
        <Text style={{fontFamily: fonts.extrabold, fontSize: 44, letterSpacing: 1, color: '#FFFFFF'}}>GHOVO</Text>
        <Text style={{fontFamily: fonts.medium, fontSize: 15, color: '#B4AED2', textAlign: 'center'}}>Rutas, récords y mucho más</Text>
      </View>

      <View style={{gap: 18}}>
        <View style={{flexDirection: 'row', justifyContent: 'center', gap: 12}}>
          {MODES.map(mode => (
            <View key={mode.label} style={{alignItems: 'center', gap: 6}}>
              <View style={{width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(26,20,53,0.92)', borderWidth: 1, borderColor: '#3A2E63', alignItems: 'center', justifyContent: 'center'}}>
                <Ionicons name={mode.icon} size={24} color={palette.purpleLight} />
              </View>
              <Text style={{fontFamily: fonts.medium, fontSize: 11, color: '#8E87AB'}}>{mode.label}</Text>
            </View>
          ))}
        </View>

        {!!message && <Text accessibilityLiveRegion="polite" style={{fontFamily: fonts.regular, fontSize: 12.5, lineHeight: 18, color: '#FBBF24', textAlign: 'center'}}>{message}</Text>}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Comenzar"
          disabled={busy}
          onPress={onSignIn}
          style={({pressed}) => ({minHeight: 58, borderRadius: 22, backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', opacity: pressed || busy ? 0.85 : 1, shadowColor: '#8B5CF6', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.45, shadowRadius: 14})}
        >
          <Text style={{fontFamily: fonts.bold, fontSize: 16, color: '#FFFFFF'}}>Comenzar</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Iniciar sesión con Google"
          disabled={busy}
          onPress={() => void google()}
          style={({pressed}) => ({minHeight: 54, borderRadius: 20, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: pressed || busy ? 0.85 : 1})}
        >
          <Ionicons name="logo-google" size={18} color="#1F1F1F" />
          <Text style={{fontFamily: fonts.semibold, fontSize: 15, color: '#1F1F1F'}}>{busy ? 'Conectando…' : 'Iniciar sesión con Google'}</Text>
        </Pressable>

        {/* Solo para pruebas: en release no existe si no se pide expresamente por entorno. */}
        {process.env.EXPO_PUBLIC_GUEST_ACCESS==='1'&&<Pressable accessibilityRole="button" accessibilityLabel="Entrar sin registrarse (provisional)" onPress={onGuest} style={({pressed}) => ({minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1})}>
          <Text style={{fontFamily: fonts.medium, fontSize: 13, color: '#8E87AB', textDecorationLine: 'underline'}}>Entrar sin registrarse · provisional</Text>
        </Pressable>}

        <Text style={{fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, color: '#6E6690', textAlign: 'center'}}>
          Para grabar necesitas una cuenta: tus rutas y tus créditos se guardan en ella.
        </Text>
      </View>
    </ScrollView>
  </View>;
}
