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
      <Text style={{ textAlign: 'center', fontSize: 11, fontWeight: '800', color: '#AAA5C4', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>TIPO DE ACTIVIDAD</Text>
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
                  borderRadius: 20,
                  backgroundColor: '#211B3C',
                  borderWidth: 1.5,
                  borderColor: selected ? '#8B5CF6' : '#332959',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  paddingVertical: 10,
                },
                selected && { backgroundColor: '#2E2254', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 6 }
              ]}
            >
              <Text style={{ fontSize: 28 }}>{icon}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: selected ? '#ffffff' : '#AAA5C4' }}>{title}</Text>
              {selected && <View style={{ width: 36, height: 3, borderRadius: 2, backgroundColor: '#8B5CF6', marginTop: 2 }} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
