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

export function RouteCard({
  summary,
  favorite,
  disabled,
  onPress,
}: {
  summary: RouteCardSummary;
  favorite: boolean;
  disabled?: boolean;
  onPress: () => void;
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
            <Ionicons name={favorite ? 'heart' : 'heart-outline'} size={17} color={favorite ? '#F472B6' : '#5F5880'} />
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
        <Ionicons name="chevron-forward" size={18} color="#6E6690" />
      </View>
    </Pressable>
  );
}
