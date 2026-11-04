import {decimal} from './format';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { clock, distance as geoDistance, type Run } from './core';
import { formatPace } from './TripDetails';
import { appStyles as s, palette } from './design';
import { fonts } from './fonts';

// Fondo de escala del velocímetro: solo define cuánto se llena la barra, no limita la grabación.
const MAX_SPEED_KMH: Record<string, number> = { driving: 130, bicycling: 55, running: 20, walking: 9 };

type Props = {
  run: Run;
  now: number;
  distance: string;
  serviceRunning: boolean;
  keepScreenOn: boolean;
  onToggleScreen: () => void;
  onRecover: () => void;
  onHelp: () => void;
  onDiscard: () => void;
  disabled: boolean;
  comparisonReference?: Run;
  onToggleVoice?: () => void;
};

export function RecordingPanel({
  run,
  now,
  distance,
  serviceRunning,
  keepScreenOn,
  onToggleScreen,
  onRecover,
  onHelp,
  onDiscard,
  disabled,
  comparisonReference,
  onToggleVoice,
}: Props) {
  const age = Math.max(0, Math.floor((now - (run.lastFixAt ?? run.points.at(-1)?.timestamp ?? run.startedAt)) / 1000));
  const paused = !!run.pausedAt;
  const stale = age > 15;
  const needsAttention = !paused && (!serviceRunning || stale || !!run.error);
  const hadLoss = useRef(false);
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    if (needsAttention) {
      hadLoss.current = true;
      return;
    }
    if (!hadLoss.current) return;
    const show = setTimeout(() => setRecovered(true), 0);
    const hide = setTimeout(() => setRecovered(false), 5000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [needsAttention]);

  const title = paused
    ? 'Grabación en pausa'
    : !serviceRunning
      ? 'Grabación interrumpida'
      : stale
        ? 'Buscando una posición precisa'
        : run.error
          ? 'Revisar señal GPS'
          : 'Grabación activa';

  // Instant speed calculation from the last 2 GPS fixes
  const points = run.points;
  const lastPoint = points.at(-1);
  const prevPoint = points.at(-2);
  let currentSpeedKmh = 0;
  if (lastPoint && prevPoint && lastPoint.timestamp > prevPoint.timestamp) {
    const dt = (lastPoint.timestamp - prevPoint.timestamp) / 1000;
    const d = geoDistance(prevPoint, lastPoint);
    if (dt > 0 && dt <= 15) {
      currentSpeedKmh = (d / dt) * 3.6;
    }
  }

  // Elapsed duration (el tiempo en pausa no cuenta)
  const elapsedMs = Math.max(0, now - (run.circuitStartedAt ?? run.startedAt) - (run.pausedAt ? now - run.pausedAt : 0));

  // Average speed
  const distNumKm = parseFloat(distance.replace(',', '.'));
  const avgSpeedKmh = elapsedMs > 0 && Number.isFinite(distNumKm) ? (distNumKm / (elapsedMs / 3600000)) : 0;

  // Comparison with Ghost Reference
  const diff = run.comparison?.difference;
  const hasDiff = diff != null;
  const isAhead = hasDiff && diff < -200;
  const isBehind = hasDiff && diff > 200;
  const diffMs = hasDiff ? Math.abs(diff!) : 0;
 // Por debajo del minuto, segundos con un decimal; a partir de ahí, minutos y segundos.
 const diffText = diffMs >= 60000 ? `${clock(diffMs)} min` : `${decimal(diffMs / 1000, 1)} s`;

  return (
    <>
      {/* Cabina compacta: velocidad y diferencia con el fantasma en una sola fila */}
      <View style={styles.cockpit}>
        <View style={{flex:1.05,gap:2}}>
          <View style={{flexDirection:'row',alignItems:'flex-end',gap:5}}>
            <Text style={styles.speedValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {run.mode === 'running' ? (currentSpeedKmh > 0 ? formatPace(currentSpeedKmh) : '—') : decimal(currentSpeedKmh,0)}
            </Text>
            <Text style={styles.speedUnit}>{run.mode === 'running' ? 'min/km' : 'km/h'}</Text>
          </View>
          <Text style={styles.speedCaption}>{run.mode === 'running' ? 'ritmo actual' : 'velocidad actual'}</Text>
          <View style={styles.speedTrack}>
            <View style={[styles.speedFill,{width:`${Math.round(Math.max(0,Math.min(1,currentSpeedKmh/MAX_SPEED_KMH[run.mode ?? 'driving']))*100)}%`}]}/>
          </View>
        </View>

        {run.referenceId&&<View style={styles.divider}/>}

        {run.referenceId&&<View style={{flex:1,gap:2}}>
          {!run.circuitStartedAt ? (
            <>
              <Text style={[styles.deltaValue,{color:palette.lavender}]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{run.entryPendingAt ? 'Confirmando…' : 'Esperando…'}</Text>
              <Text style={styles.deltaCaption}>{run.entryPendingAt ? 'Una posición más sobre el trazado' : 'El fantasma arranca al entrar'}</Text>
            </>
          ) : hasDiff ? (
            <>
              <Text style={[styles.deltaValue,isAhead?{color:'#34D399'}:isBehind?{color:'#FB7185'}:{color:palette.lavender}]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {isAhead ? `▲ -${diffText}` : isBehind ? `▼ +${diffText}` : '= 0,0 s'}
              </Text>
              <Text style={styles.deltaCaption}>{isAhead ? 'Vas ganando al fantasma' : isBehind ? 'Por detrás de tu referencia' : 'Mismo tiempo'}</Text>
            </>
          ) : (
            <>
              <Text style={[styles.deltaValue,{color:palette.muted}]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Buscando…</Text>
              <Text style={styles.deltaCaption}>{comparisonReference ? 'Comparando con tu huella' : 'Sincronizando puntos'}</Text>
            </>
          )}
        </View>}
      </View>

      {/* Tres cifras con la misma estructura: etiqueta, valor y unidad */}
      <View style={s.cockpitGrid}>
        <View style={[s.cockpitMetricBox, styles.metricBox]}>
          <Text style={styles.metricLabel} numberOfLines={1}>{run.referenceId && run.circuitStartedAt ? 'EN RUTA' : 'TIEMPO'}</Text>
          <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{clock(elapsedMs)}</Text>
          <Text style={styles.metricUnit}>min</Text>
        </View>

        <View style={[s.cockpitMetricBox, styles.metricBox]}>
          <Text style={styles.metricLabel} numberOfLines={1}>DISTANCIA</Text>
          <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{decimal(distNumKm,2)}</Text>
          <Text style={styles.metricUnit}>km</Text>
        </View>

        <View style={[s.cockpitMetricBox, styles.metricBox]}>
          <Text style={styles.metricLabel} numberOfLines={1}>{run.mode === 'running' ? 'RITMO MEDIO' : 'VEL. MEDIA'}</Text>
          <Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {run.mode === 'running'
              ? (avgSpeedKmh > 0 ? formatPace(avgSpeedKmh) : '—')
              : decimal(avgSpeedKmh,1)}
          </Text>
          <Text style={styles.metricUnit}>{run.mode === 'running' ? 'min/km' : 'km/h'}</Text>
        </View>
      </View>

      {/* Quick Toggles: Screen On & Voice Notices */}
      <View style={s.quickTogglesRow}>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Mantener pantalla encendida"
          accessibilityState={{ checked: keepScreenOn, disabled }}
          disabled={disabled}
          onPress={onToggleScreen}
          style={[s.quickTogglePill, keepScreenOn && s.quickTogglePillActive]}
        >
          <Text style={{ fontSize: 14 }}>{keepScreenOn ? '🔆' : '🌙'}</Text>
          <Text style={[s.quickToggleText, keepScreenOn && s.quickToggleTextActive]}>
            {keepScreenOn ? 'Pantalla ON' : 'Pantalla OFF'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Avisos de voz durante la ruta"
          accessibilityState={{ checked: run.voiceEnabled !== false, disabled }}
          disabled={disabled}
          onPress={onToggleVoice}
          style={[s.quickTogglePill, run.voiceEnabled !== false && s.quickTogglePillActive]}
        >
          <Text style={{ fontSize: 14 }}>{run.voiceEnabled !== false ? '🔊' : '🔇'}</Text>
          <Text style={[s.quickToggleText, run.voiceEnabled !== false && s.quickToggleTextActive]}>
            {run.voiceEnabled !== false ? 'Avisos voz: SÍ' : 'Avisos voz: NO'}
          </Text>
        </Pressable>
      </View>

      {/* Signal Status Pill */}
      <View style={[s.signalCard, needsAttention && s.signalAttention]}>
        <View style={[s.signalDot, { backgroundColor: needsAttention ? '#F4CCA0' : '#C0ED8B' }]} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text accessibilityLiveRegion="polite" style={s.signalTitle}>
            {title}
          </Text>
          <Text style={s.caption}>
            {!serviceRunning
              ? 'El servicio GPS está detenido. El tiempo sigue contando.'
              : stale
                ? `Última posición válida hace ${age} s.`
                : `✓ Precisión estimada: ±${Math.round(run.lastAccuracy ?? run.points.at(-1)?.accuracy ?? 25)} m · guardando posiciones.`}
          </Text>
        </View>
      </View>

      {recovered && !needsAttention && (
        <Text accessibilityLiveRegion="polite" style={s.tabSelected}>
          Señal GPS recuperada
        </Text>
      )}
      {!!run.error && <Text style={s.warning}>{run.error}</Text>}

      {needsAttention && (
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          accessibilityState={{ disabled }}
          onPress={onRecover}
          style={[s.button, s.secondary]}
        >
          <Text style={s.lightText}>Recuperar señal GPS</Text>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  cockpit: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#1A1435', borderWidth: 1.5, borderColor: '#332959' },
  speedValue: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 44, color: '#FFFFFF', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  speedUnit: { fontFamily: fonts.semibold, fontSize: 12, color: palette.purpleLight, paddingBottom: 6 },
  speedCaption: { fontFamily: fonts.medium, fontSize: 9, letterSpacing: 1.1, textTransform: 'uppercase', color: '#8E87AB' },
  speedTrack: { height: 4, borderRadius: 2, backgroundColor: '#2A2049', overflow: 'hidden', marginTop: 4 },
  speedFill: { height: '100%', borderRadius: 2, backgroundColor: palette.purpleBright },
  divider: { width: 1, alignSelf: 'stretch', backgroundColor: '#332959', marginVertical: 2 },
  deltaValue: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 26, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  deltaCaption: { fontFamily: fonts.medium, fontSize: 10, color: '#8E87AB' },
  // Misma estructura en las tres cifras: la etiqueta y la unidad ocupan su línea, así los
  // valores quedan a la misma altura aunque el texto de arriba sea más largo o más corto.
  metricBox: { alignItems: 'center', justifyContent: 'flex-start', gap: 2 },
  // lineHeight propio en cada línea: sin él, la caja de la etiqueta se comía la mitad
  // superior de la cifra y ambas se veían pegadas.
  metricLabel: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 16, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8E87AB' },
  metricValue: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, color: '#FFFFFF', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  metricUnit: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 14, color: palette.purpleLight },
});
