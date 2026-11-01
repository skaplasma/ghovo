import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { getAdState, subscribeAd, initAds, loadRewardedAd, showRewardedAd, useRewardedAd, TEST_REWARDED_AD_UNIT } from '../src/ads';

test('ads module exposes test ad unit and initial state', () => {
  expect(TEST_REWARDED_AD_UNIT).toBe('ca-app-pub-3940256099942544/5224354917');
  const state = getAdState();
  expect(typeof state.isLoaded).toBe('boolean');
  expect(typeof state.state).toBe('string');
});

test('subscribeAd manages listeners', () => {
  let called = 0;
  const unsubscribe = subscribeAd(() => {
    called++;
  });
  expect(typeof unsubscribe).toBe('function');
  unsubscribe();
  expect(called).toBe(0);
});

test('initAds and loadRewardedAd do not throw', async () => {
  await expect(initAds()).resolves.toBeUndefined();
  expect(() => loadRewardedAd()).not.toThrow();
});

test('showRewardedAd returns false when ad is not ready', async () => {
  const result = await showRewardedAd(() => {});
  expect(result).toBe(false);
});

function AdConsumer() {
  const ad = useRewardedAd();
  return <Text testID="ad-state">{ad.state}</Text>;
}

test('useRewardedAd hook exposes state in components', async () => {
  await render(<AdConsumer />);
  expect(screen.getByTestId('ad-state')).toHaveTextContent('idle');
});
