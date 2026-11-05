import React from 'react';
import {Pressable, Text, View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {clock, duration, isComparable, type Run} from './core';
import {appStyles as s, palette} from './design';
import {fonts} from './fonts';
import {date, km} from './format';
import {RouteThumbnail} from './RouteVisuals';
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
            {date(latest)} · {km(route)} · {trips} {trips === 1 ? 'salida' : 'salidas'}
          </Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1}}>
            <Ionicons name="trophy" size={13} color={palette.yellowGold} />
            <Text style={{fontFamily: fonts.bold, color: palette.yellowGold, fontSize: 15, fontVariant: ['tabular-nums']}}>{clock(duration(best))}</Text>
            <Text style={[s.caption, {fontSize: 10.5}]}>{isComparable(best) ? 'mejor tiempo' : 'referencia'}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
