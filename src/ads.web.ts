import { useState } from 'react';

export const TEST_REWARDED_AD_UNIT = 'ca-app-pub-3940256099942544/5224354917';

export type AdReward = { amount: number; type: string };
export type AdState = 'idle' | 'loading' | 'loaded' | 'showing' | 'error';

export const adUnitId: string = TEST_REWARDED_AD_UNIT;

export function getAdState(): { state: AdState; isLoaded: boolean; error: string | null } {
  return { state: 'idle', isLoaded: false, error: 'Ads not supported on web' };
}

export function subscribeAd(_listener: () => void) {
  return () => {};
}

export async function initAds(): Promise<void> {
  return Promise.resolve();
}

export function loadRewardedAd(): void {
  // No-op on web
}

export async function showRewardedAd(_onReward: (reward: AdReward) => Promise<void> | void): Promise<boolean> {
  return false;
}

export function useRewardedAd() {
  const [adInfo] = useState(getAdState);

  return {
    ...adInfo,
    showAd: showRewardedAd,
    reloadAd: loadRewardedAd,
  };
}
