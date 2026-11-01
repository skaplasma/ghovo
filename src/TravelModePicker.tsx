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
    <View style={{ gap: 10, paddingVertical: 6 }} accessibilityLabel="Modo de recorrido">
      <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#7a889b', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>Route Details</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {MODES.map(({ mode, label, icon, title }) => {
          const selected = mode === value;
          return (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(mode)}
              style={[
                {
                  flexBasis: '47%',
                  flexGrow: 1,
                  minHeight: 82,
                  borderRadius: 18,
                  backgroundColor: '#151c24',
                  borderWidth: 1,
                  borderColor: selected ? '#38485a' : '#222b37',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  paddingVertical: 10,
                },
                selected && { backgroundColor: '#1a232e' }
              ]}
            >
              <Text style={{ fontSize: 28 }}>{icon}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: selected ? '#ffffff' : '#7a889b' }}>{title}</Text>
              {selected && <View style={{ width: 36, height: 3, borderRadius: 2, backgroundColor: '#ffffff', marginTop: 2 }} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
