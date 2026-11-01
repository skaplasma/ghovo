import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Checkpoint } from './checkpoints';
import { type Point } from './core';

export function RouteMap({
  points,
  reference,
  ghost,
  recording,
  preparing = false,
  previewPosition,
  checkpoints = [],
}: {
  points: Point[];
  reference?: Point[];
  ghost?: Point;
  recording: boolean;
  preparing?: boolean;
  previewPosition?: Point;
  checkpoints?: Checkpoint[];
}) {
  const [locationMessage] = useState(
    recording ? 'Grabación en curso (vista web)' : 'Vista previa de la ruta (web)'
  );

  const first = points[0];
  const last = points.at(-1);
  const focus = recording ? last : first ?? previewPosition;

  // Compute bounding box for SVG projection
  const allPoints = useMemo(() => {
    const list: Point[] = [...points];
    if (reference) list.push(...reference);
    if (ghost) list.push(ghost);
    if (focus) list.push(focus);
    return list;
  }, [points, reference, ghost, focus]);

  const { minLat, maxLat, minLng, maxLng } = useMemo(() => {
    if (!allPoints.length) {
      return { minLat: 40.4, maxLat: 40.5, minLng: -3.8, maxLng: -3.6 };
    }
    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity;
    for (const p of allPoints) {
      if (p.latitude < minLat) minLat = p.latitude;
      if (p.latitude > maxLat) maxLat = p.latitude;
      if (p.longitude < minLng) minLng = p.longitude;
      if (p.longitude > maxLng) maxLng = p.longitude;
    }
    const padLat = Math.max((maxLat - minLat) * 0.15, 0.002);
    const padLng = Math.max((maxLng - minLng) * 0.15, 0.002);
    return {
      minLat: minLat - padLat,
      maxLat: maxLat + padLat,
      minLng: minLng - padLng,
      maxLng: maxLng + padLng,
    };
  }, [allPoints]);

  const project = (p: Point, width = 360, height = 220) => {
    const x = ((p.longitude - minLng) / Math.max(maxLng - minLng, 0.0001)) * width;
    const y = ((maxLat - p.latitude) / Math.max(maxLat - minLat, 0.0001)) * height;
    return { x: Math.max(10, Math.min(width - 10, x)), y: Math.max(10, Math.min(height - 10, y)) };
  };

  const pointsToPath = (pts: Point[], w = 360, h = 220) => {
    if (!pts.length) return '';
    return pts
      .map((p, i) => {
        const { x, y } = project(p, w, h);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const recordingPath = useMemo(() => pointsToPath(points), [points, minLat, maxLat, minLng, maxLng]);
  const referencePath = useMemo(
    () => (reference ? pointsToPath(reference) : ''),
    [reference, minLat, maxLat, minLng, maxLng]
  );

  return (
    <View style={styles.container}>
      {allPoints.length > 0 ? (
        <View style={styles.mapArea}>
          {/* Stylized background grid representing map surface */}
          <svg
            viewBox="0 0 360 220"
            style={{ width: '100%', height: '100%', display: 'block', backgroundColor: '#101B22' }}
          >
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1A2833" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Reference track */}
            {referencePath ? (
              <path
                d={referencePath}
                fill="none"
                stroke="#9685FF"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.8"
              />
            ) : null}

            {/* Recording track */}
            {recordingPath ? (
              <>
                <path
                  d={recordingPath}
                  fill="none"
                  stroke="#F7FFF1"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.9"
                />
                <path
                  d={recordingPath}
                  fill="none"
                  stroke="#4A8B3B"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : null}

            {/* Start pin (A) */}
            {first ? (
              <g transform={`translate(${project(first).x}, ${project(first).y})`}>
                <circle r="9" fill="#A1F27A" stroke="#101B20" strokeWidth="2" />
                <text
                  textAnchor="middle"
                  dy="4"
                  fill="#101B20"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  A
                </text>
              </g>
            ) : null}

            {/* End pin (B) */}
            {!recording && last && last !== first ? (
              <g transform={`translate(${project(last).x}, ${project(last).y})`}>
                <circle r="9" fill="#FFC58A" stroke="#101B20" strokeWidth="2" />
                <text
                  textAnchor="middle"
                  dy="4"
                  fill="#101B20"
                  fontSize="11"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  B
                </text>
              </g>
            ) : null}

            {/* Checkpoints */}
            {checkpoints.map(cp => {
              const pos = project(cp.point);
              return (
                <g key={cp.index} transform={`translate(${pos.x}, ${pos.y})`}>
                  <circle r="6" fill="#B9AEF5" stroke="#FFFFFF" strokeWidth="1.5" />
                </g>
              );
            })}

            {/* Current / Last position dot */}
            {recording && last ? (
              <g transform={`translate(${project(last).x}, ${project(last).y})`}>
                <circle r="12" fill="#80D6FF" opacity="0.3" />
                <circle r="6" fill="#80D6FF" stroke="#FFFFFF" strokeWidth="2" />
              </g>
            ) : null}

            {/* Ghost mascot pin */}
            {ghost ? (
              <g transform={`translate(${project(ghost).x - 12}, ${project(ghost).y - 12})`}>
                <circle cx="12" cy="12" r="14" fill="#101C22" stroke="#B9AEF5" strokeWidth="2" />
              </g>
            ) : null}
          </svg>

          {/* HTML Ghost mascot overlay if ghost exists */}
          {ghost ? (
            <View
              style={[
                styles.ghostOverlay,
                {
                  left: `${((project(ghost).x) / 360) * 100}%`,
                  top: `${((project(ghost).y) / 220) * 100}%`,
                },
              ]}
            >
              <Image
                source={require('../assets/ghovo-mascot-2d-v1.png')}
                style={{ width: 28, height: 28 }}
                resizeMode="contain"
                accessible={false}
              />
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          {recording ? (
            <ActivityIndicator color="#C0ED8B" size="large" />
          ) : null}
          <Text style={styles.emptyText}>
            {recording ? 'Esperando primeros puntos GPS…' : 'El mapa aparecerá al iniciar la ruta.'}
          </Text>
        </View>
      )}

      {!recording && !preparing ? (
        <View style={styles.statusBar}>
          <View style={styles.locationBadge}>
            <Text style={{ color: '#C0ED8B', fontSize: 13 }}>◎</Text>
            <Text style={{ color: '#D6E2E8', fontSize: 11, fontWeight: '500' }}>{locationMessage}</Text>
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Créditos de OpenStreetMap"
        style={styles.credit}
        onPress={() => {
          Linking.openURL('https://www.openstreetmap.org/copyright').catch(() => {});
        }}
      >
        <Text style={styles.creditText}>© OpenStreetMap · Web Preview</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 180,
    backgroundColor: '#101B22',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
  },
  mapArea: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  ghostOverlay: {
    position: 'absolute',
    transform: [{ translateX: -14 }, { translateY: -14 }],
    width: 28,
    height: 28,
    pointerEvents: 'none',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121C23',
    padding: 24,
    gap: 12,
  },
  emptyText: {
    color: '#D6E2E8',
    textAlign: 'center',
    fontSize: 14,
  },
  statusBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
  },
  locationBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0B1115ED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#394852',
  },
  credit: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#101B22CC',
    borderTopLeftRadius: 8,
  },
  creditText: {
    color: '#7F949F',
    fontSize: 10,
  },
});
