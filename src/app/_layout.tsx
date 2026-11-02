import {AccountSessionBridge} from '../AccountSessionBridge';
import React from 'react';
import {Slot} from 'expo-router';
import {SafeAreaView} from 'react-native-safe-area-context';
import {palette} from '../design';
import {useAppFonts} from '../fonts';
import {AppProvider} from '../../App';
export default function RootLayout(){
  // La carga es asíncrona: el árbol vuelve a dibujarse cuando la tipografía está lista.
  useAppFonts();
  return <SafeAreaView edges={['bottom','left','right']} style={{flex:1,backgroundColor:palette.background}}><AppProvider><AccountSessionBridge/><Slot/></AppProvider></SafeAreaView>;
}
