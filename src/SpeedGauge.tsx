import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { fonts } from './fonts';
import { palette } from './design';

const SIZE = 232;
const STROKE = 15;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
// 270° útiles: el hueco queda abajo, como el velocímetro del mockup.
const SWEEP = 0.75;
const TRACK = CIRCUMFERENCE * SWEEP;
const START = 135;

export function SpeedGauge({
  value,
  unit,
  caption,
  ratio,
}: {
  value: string;
  unit: string;
  caption: string;
  ratio: number;
}) {
  const clamped = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
  const arc = TRACK * clamped;
  const center = SIZE / 2;
  const dashProps = {
    cx: center,
    cy: center,
    r: RADIUS,
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    transform: `rotate(${START} ${center} ${center})`,
  };

  return (
    <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={SIZE} height={SIZE}>
        <Defs>
          <LinearGradient id="gaugeStroke" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor={palette.purpleNeon} />
            <Stop offset="0.55" stopColor={palette.purpleBright} />
            <Stop offset="1" stopColor={palette.pink} />
          </LinearGradient>
        </Defs>
        <Circle {...dashProps} stroke="#241C40" strokeWidth={STROKE} strokeDasharray={`${TRACK} ${CIRCUMFERENCE}`} />
        {/* Halo suave detrás del arco activo */}
        <Circle {...dashProps} stroke="url(#gaugeStroke)" strokeWidth={STROKE + 10} strokeOpacity={0.14} strokeDasharray={`${arc} ${CIRCUMFERENCE}`} />
        <Circle {...dashProps} stroke="url(#gaugeStroke)" strokeWidth={STROKE} strokeDasharray={`${arc} ${CIRCUMFERENCE}`} />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center', gap: 0 }}>
        <Text
          style={{ fontFamily: fonts.extrabold, fontSize: 62, lineHeight: 68, color: '#FFFFFF', letterSpacing: -2, fontVariant: ['tabular-nums'] }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {value}
        </Text>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: palette.purpleLight, letterSpacing: 0.5 }}>{unit}</Text>
        <Text style={{ fontFamily: fonts.medium, fontSize: 10.5, color: '#8E87AB', letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 6 }}>{caption}</Text>
      </View>
    </View>
  );
}
