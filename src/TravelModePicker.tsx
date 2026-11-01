import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { TravelMode } from './core';
import { appStyles as s } from './design';

const MODES: readonly { mode: TravelMode; label: string; icon: string; title: string }[] = [
  { mode: 'driving', label: 'En coche', icon: '🚗', title: 'Coche' },
  { mode: 'bicycling', label: 'En bici', icon: '🚲', title: 'Bici' },
  { mode: 'running', label: 'Corriendo', icon: '🏃', title: 'Correr' },
  { mode: 'walking', label: 'A pie', icon: '🚶', title: 'A pie' },
] as const;

export function TravelModePicker({ value, onChange, disabled }: { value: TravelMode; onChange: (mode: TravelMode) => void; disabled: boolean }) {
  return (
    <View style={s.modePicker} accessibilityLabel="Modo de recorrido">
      {MODES.map(({ mode, label, icon, title }) => (
        <Pressable
          key={mode}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected: mode === value, disabled }}
          disabled={disabled}
          onPress={() => onChange(mode)}
          style={[s.modeChoice, mode === value && s.modeChoiceSelected]}
        >
          <Text style={{ fontSize: 16 }}>{icon}</Text>
          <Text style={[s.modeText, mode === value && { color: '#D9F5BB', fontWeight: '700' }]}>{title}</Text>
        </Pressable>
      ))}
    </View>
  );
}
