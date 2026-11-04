import React from 'react';
import {Linking, Pressable, ScrollView, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {appStyles as s, palette} from './design';
import {fonts} from './fonts';

// URL pública de la política completa (GitHub Pages, por ejemplo). Se puede cambiar sin
// recompilar código con EXPO_PUBLIC_PRIVACY_URL.
export const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://skaplasma.github.io/ghovo/privacidad.html';

type Block = {title: string; body: string};

// Resumen dentro de la app. La versión completa y con validez legal vive en PRIVACIDAD.md
// y en PRIVACY_URL; aquí está lo que el usuario necesita entender sin salir de GHOVO.
export const PRIVACY_BLOCKS: Block[] = [
  {title: 'Qué guarda GHOVO en tu móvil', body: 'Los recorridos con su trazado, fecha, precisión estimada, nombre de la ruta, notas y favoritas. Se guardan en una base de datos privada de la app y desaparecen si la desinstalas.'},
  {title: 'Qué se envía a un servidor', body: 'Solo la cuenta (correo electrónico), el saldo de créditos y el libro de movimientos. El trazado de tus rutas NO se sube: se queda en el teléfono salvo que tú exportes una copia.'},
  {title: 'Ubicación', body: 'Se usa la ubicación precisa mientras grabas y también en segundo plano durante la grabación, para que el recorrido continúe con la pantalla apagada. Puedes revocar el permiso en los ajustes de Android; la grabación se detendrá.'},
  {title: 'Anuncios', body: 'Los anuncios son voluntarios: ves uno si quieres un crédito, nunca durante una ruta activa. Google AdMob puede tratar identificadores del dispositivo según su política. El consentimiento se pide antes y puedes cambiarlo con «Opciones de privacidad».'},
  {title: 'Terceros', body: 'Supabase (cuenta y saldo), Google (inicio de sesión y anuncios) y OpenStreetMap (teselas del mapa, que reciben la zona que ves). No se venden datos personales.'},
  {title: 'Diagnóstico', body: 'Se guardan eventos técnicos de GPS (permisos, pérdida de señal, tiempos de espera) con un límite de 200 por dispositivo. No contienen coordenadas ni nombres de rutas.'},
  {title: 'Tus derechos', body: 'Puedes exportar tus rutas, eliminar tu cuenta y todos sus datos desde «Eliminar mi cuenta», o escribir a cristianmartinezweb@gmail.com. También puedes reclamar ante la Agencia Española de Protección de Datos.'},
  {title: 'Menores', body: 'GHOVO no está dirigida a menores de 14 años y no recoge datos de menores de esa edad de forma consciente.'},
];

export function PrivacyScreen({onClose}: {onClose: () => void}) {
  return <View style={{flex: 1}}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onClose} style={{width: 42, height: 42, borderRadius: 21, backgroundColor: '#1A1435', borderWidth: 1, borderColor: '#2D2350', alignItems: 'center', justifyContent: 'center'}}>
        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
      </Pressable>
      <Text style={s.cardTitle}>Privacidad</Text>
    </View>
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.eyebrow}>TUS DATOS EN GHOVO</Text>
      <Text style={[s.muted, {marginBottom: 4}]}>Última actualización: 4 de noviembre de 2026. Este resumen está dentro de la app; la versión completa está enlazada al final.</Text>
      {PRIVACY_BLOCKS.map(block =>
        <View key={block.title} style={{gap: 4}}>
          <Text style={{fontFamily: fonts.semibold, color: palette.text, fontSize: 15}}>{block.title}</Text>
          <Text style={s.caption}>{block.body}</Text>
        </View>)}
      <Pressable accessibilityRole="link" accessibilityLabel="Abrir la política completa en el navegador" onPress={() => { void Linking.openURL(PRIVACY_URL).catch(() => {}); }} style={[s.button, s.secondary, {flexDirection: 'row', gap: 8}]}>
        <Ionicons name="open-outline" size={16} color="#FFFFFF" />
        <Text style={s.lightText}>Ver la política completa</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver a Perfil" onPress={onClose} style={{minHeight: 44, alignItems: 'center', justifyContent: 'center'}}>
        <Text style={s.caption}>Para borrar tu cuenta, usa «Eliminar mi cuenta» en Perfil.</Text>
      </Pressable>
    </ScrollView>
  </View>;
}
