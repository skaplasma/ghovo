import { t as tr } from './i18n-core';
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {clock, duration, isComparable, type Run} from './core';
import {appStyles as s, palette} from './design';
import {fonts} from './fonts';
import {date, km} from './format';
import {RouteThumbnail} from './RouteVisuals';
import {useLanguage} from './i18n';
import {modeLabel} from './TripDetails';

export type RouteCardSummary = {reference: Run; attempts: Run[]; best: Run; latest: Run};

// Acciones rápidas de la tarjeta: favorita y compartir sin abrir la ruta.
function CardAction({icon, color, label, onPress}: {icon: keyof typeof Ionicons.glyphMap; color: string; label: string; onPress?: () => void}) {
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={6}
    onPress={onPress}
    style={({pressed}) => ({width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? '#2A2049' : '#1C1636', borderWidth: 1, borderColor: '#2D2350'})}
  >
    <Ionicons name={icon} size={16} color={color} />
  </Pressable>;
}

export function RouteCard({
  summary,
  favorite,
  disabled,
  onPress,
  onFavorite,
  onShare,
}: {
  summary: RouteCardSummary;
  favorite: boolean;
  disabled?: boolean;
  onPress: () => void;
  onFavorite?: () => void;
  onShare?: () => void;
}) {
  const {t: tr} = useLanguage();
  const {reference: route, attempts, best, latest} = summary;
  const trips = attempts.length;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${route.name}, ${km(route)}, ${isComparable(best) ? 'mejor tiempo' : 'tiempo de referencia'} ${clock(duration(best))}`}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [s.card, {opacity: pressed ? 0.75 : 1, borderRadius: 22, borderColor: '#2D2350', padding: 14, backgroundColor: '#15112D'}]}
    >
      <View style={s.routeCardHeading}>
        <RouteThumbnail points={route.points} />
        <View style={{flex: 1, gap: 3}}>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
            <Text style={s.routeMode}>{modeLabel(route.mode).toUpperCase()}</Text>
            <View style={{flexDirection: 'row', gap: 6}}>
              {onFavorite && <CardAction icon={favorite ? 'heart' : 'heart-outline'} color={favorite ? '#F472B6' : '#8E87AB'} label={favorite ? `Quitar ${route.name} de favoritas` : `Añadir ${route.name} a favoritas`} onPress={onFavorite} />}
              {onShare && <CardAction icon="share-outline" color="#B9AEF5" label={`Compartir la ruta ${route.name}`} onPress={onShare} />}
            </View>
          </View>
          <Text style={[s.cardTitle, {fontSize: 17}]} numberOfLines={1}>{route.name}</Text>
          <Text style={s.caption} numberOfLines={1}>
            {date(latest)} · {km(route)} · {trips} {trips === 1 ? tr('card.tripOne') : tr('card.trips')}
          </Text>
        </View>
      </View>

      {/* El mejor tiempo va en su propia franja: es el dato que se busca al abrir la lista. */}
      <View style={styles.bestStrip}>
        <Ionicons name="trophy" size={15} color={palette.yellowGold} />
        <Text style={styles.bestLabel}>{isComparable(best) ? tr('card.best') : tr('card.reference')}</Text>
        <Text style={styles.bestValue}>{clock(duration(best))}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bestStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: '#1E1838', borderWidth: 1, borderColor: '#332959' },
  bestLabel: { flex: 1, fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.1, color: '#8E87AB' },
  bestValue: { fontFamily: fonts.extrabold, fontSize: 26, color: palette.yellowGold, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
});
