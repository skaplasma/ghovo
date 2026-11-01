import { GpsDiagnostics } from './GpsDiagnostics';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { clock, distance as geoDistance, type Run } from './core';
import { formatPace, modeLabel } from './TripDetails';
import { appStyles as s } from './design';

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
  const [options, setOptions] = useState(false);
  const age = Math.max(0, Math.floor((now - (run.lastFixAt ?? run.points.at(-1)?.timestamp ?? run.startedAt)) / 1000));
  const stale = age > 15;
  const needsAttention = !serviceRunning || stale || !!run.error;
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

  const title = !serviceRunning
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

  // Elapsed duration
  const elapsedMs = Math.max(0, now - (run.circuitStartedAt ?? run.startedAt));

  // Average speed
  const distNumKm = parseFloat(distance.replace(',', '.'));
  const avgSpeedKmh = elapsedMs > 0 && Number.isFinite(distNumKm) ? (distNumKm / (elapsedMs / 3600000)) : 0;

  // Comparison with Ghost Reference
  const diff = run.comparison?.difference;
  const hasDiff = diff != null;
  const isAhead = hasDiff && diff < -200;
  const isBehind = hasDiff && diff > 200;
  const diffSeconds = hasDiff ? (Math.abs(diff) / 1000).toFixed(1) : null;

  return (
    <>
      {/* Route & Mode Banner */}
      <View style={[s.recordHeading, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <Text style={s.eyebrow}>{modeLabel(run.mode).toUpperCase()}</Text>
        <Text style={[s.recordTitle, { fontSize: 18, flexShrink: 1 }]} numberOfLines={1}>
          {run.name}
        </Text>
      </View>

      {/* Central Cockpit Speedometer / Pace */}
      <View style={s.hudSpeedContainer}>
        {run.mode === 'running' ? (
          <>
            <Text style={s.hudSpeedValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {currentSpeedKmh > 0 ? formatPace(currentSpeedKmh) : '— /km'}
            </Text>
            <Text style={s.hudSpeedUnit}>Ritmo actual (min/km)</Text>
          </>
        ) : (
          <>
            <Text style={s.hudSpeedValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {currentSpeedKmh > 0 ? currentSpeedKmh.toFixed(0) : '0'}
            </Text>
            <Text style={s.hudSpeedUnit}>km/h · Velocidad actual</Text>
          </>
        )}
      </View>

      {/* Delta Box with Ghost Comparison */}
      {run.referenceId && (
        <View
          style={[
            s.deltaBox,
            !run.circuitStartedAt
              ? s.deltaBoxNeutral
              : isAhead
                ? s.deltaBoxAhead
                : isBehind
                  ? s.deltaBoxBehind
                  : s.deltaBoxNeutral,
          ]}
        >
          {!run.circuitStartedAt ? (
            <>
              <Text style={[s.deltaDeltaText, s.deltaNeutralText]}>◎ Esperando entrada</Text>
              <Text style={s.deltaSubtitle}>El cronómetro del fantasma se activará al entrar en el trazado</Text>
            </>
          ) : hasDiff ? (
            <>
              <Text
                style={[
                  s.deltaDeltaText,
                  isAhead ? s.deltaAheadText : isBehind ? s.deltaBehindText : s.deltaNeutralText,
                ]}
              >
                {isAhead ? `▲ -${diffSeconds} s` : isBehind ? `▼ +${diffSeconds} s` : '= Mismo tiempo'}
              </Text>
              <Text style={s.deltaSubtitle}>
                {isAhead
                  ? 'Vas ganando tiempo al fantasma'
                  : isBehind
                    ? 'Por detrás de tu referencia'
                    : 'Tiempo exacto en este punto'}
              </Text>
            </>
          ) : (
            <>
              <Text style={[s.deltaDeltaText, s.deltaNeutralText]}>Buscando trazado</Text>
              <Text style={s.deltaSubtitle}>
                {comparisonReference ? 'Comparando con tu mejor huella' : 'Sincronizando puntos de paso'}
              </Text>
            </>
          )}
        </View>
      )}

      {/* 3-Column Cockpit Telemetry Grid */}
      <View style={s.cockpitGrid}>
        <View style={s.cockpitMetricBox}>
          <Text style={s.cockpitMetricLabel}>{run.referenceId && run.circuitStartedAt ? 'En ruta' : 'Tiempo'}</Text>
          <Text style={s.cockpitMetricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {clock(elapsedMs)}
          </Text>
        </View>

        <View style={s.cockpitMetricBox}>
          <Text style={s.cockpitMetricLabel}>Distancia</Text>
          <Text style={s.cockpitMetricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {distance}
          </Text>
        </View>

        <View style={s.cockpitMetricBox}>
          <Text style={s.cockpitMetricLabel}>{run.mode === 'running' ? 'Ritmo medio' : 'Vel. media'}</Text>
          <Text style={s.cockpitMetricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {run.mode === 'running'
              ? (avgSpeedKmh > 0 ? formatPace(avgSpeedKmh) : '—')
              : `${avgSpeedKmh.toFixed(1)} km/h`}
          </Text>
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

      {/* Secondary Options and Diagnostics Collapsible */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={options ? 'Ocultar opciones' : 'Opciones y ayuda'}
        accessibilityState={{ expanded: options }}
        onPress={() => setOptions(value => !value)}
        style={s.optionsLink}
      >
        <Text style={s.caption}>{options ? 'Ocultar opciones' : 'Opciones y ayuda'}</Text>
        <Text style={s.caption}>{options ? '−' : '+'}</Text>
      </Pressable>

      {options && (
        <View style={s.card}>
          <GpsDiagnostics />
          <Text style={s.caption}>
            Última posición válida: hace {age} s. {run.rejectedFixes ?? 0} posiciones descartadas por precisión o saltos.
          </Text>
          <Text style={s.caption}>
            Puedes bloquear el móvil con su botón físico. La grabación está preparada para continuar en segundo plano.
          </Text>
          <Pressable accessibilityRole="button" onPress={onHelp} style={[s.button, s.secondary]}>
            <Text style={s.lightText}>Ayuda con pantalla bloqueada</Text>
          </Pressable>
          {!needsAttention && (
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
          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            accessibilityState={{ disabled }}
            onPress={onDiscard}
            style={[s.button, s.secondary]}
          >
            <Text style={s.lightText}>Guardar para más tarde</Text>
          </Pressable>
        </View>
      )}
    </>
  );
}
