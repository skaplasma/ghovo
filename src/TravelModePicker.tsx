import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { TravelMode } from './core';
import { useLanguage } from './i18n';

const MODES: readonly { mode: TravelMode; key: string; icon: string }[] = [
  { mode: 'driving', key: 'mode.driving', icon: '🚗' },
  { mode: 'bicycling', key: 'mode.bicycling', icon: '🚲' },
  { mode: 'running', key: 'mode.running', icon: '🏃' },
  { mode: 'walking', key: 'mode.walking', icon: '🚶' },
] as const;

export function TravelModePicker({ value, onChange, disabled }: { value: TravelMode; onChange: (mode: TravelMode) => void; disabled: boolean }) {
  const { t: tr } = useLanguage();
  return (
    <View style={{ gap: 10, paddingVertical: 6 }} accessibilityLabel={tr('mode.title')}>
      <Text style={{ textAlign: 'center', fontSize: 11, fontWeight: '800', color: '#AAA5C4', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2 }}>{tr('mode.title')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {MODES.map(({ mode, key, icon }) => {
          const selected = mode === value;
          return (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityLabel={tr(key)}
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
              <Text style={{ fontSize: 14, fontWeight: '700', color: selected ? '#ffffff' : '#AAA5C4' }}>{tr(key)}</Text>
              {selected && <View style={{ width: 36, height: 3, borderRadius: 2, backgroundColor: '#8B5CF6', marginTop: 2 }} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
