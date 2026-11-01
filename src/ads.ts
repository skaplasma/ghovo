import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export const TEST_REWARDED_AD_UNIT = 'ca-app-pub-3940256099942544/5224354917';

export type AdReward = { amount: number; type: string };
export type AdState = 'idle' | 'loading' | 'loaded' | 'showing' | 'error';

let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let AdEventType: any = null;
let mobileAds: any = null;
let TestIds: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const gma = require('react-native-google-mobile-ads');
  RewardedAd = gma.RewardedAd;
  RewardedAdEventType = gma.RewardedAdEventType;
  AdEventType = gma.AdEventType;
  mobileAds = gma.default;
  TestIds = gma.TestIds;
} catch {
  // Graceful fallback for non-native or test environments
}

export const adUnitId: string = TestIds?.REWARDED ?? TEST_REWARDED_AD_UNIT;

let currentAd: any = null;
let currentState: AdState = 'idle';
let currentError: string | null = null;
let initialized = false;
let pendingOnReward: ((reward: AdReward) => Promise<void> | void) | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    try { listener(); } catch {}
  }
}

export function getAdState(): { state: AdState; isLoaded: boolean; error: string | null } {
  return { state: currentState, isLoaded: currentState === 'loaded', error: currentError };
}

export function subscribeAd(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function initAds(): Promise<void> {
  if (initialized || Platform.OS === 'web' || !mobileAds) return;
  try {
    await mobileAds().initialize();
    initialized = true;
  } catch (e) {
    console.warn('[Ads] SDK initialization failed:', e);
  }
}

export function loadRewardedAd(): void {
  if (Platform.OS === 'web' || !RewardedAd) {
    currentState = 'idle';
    return;
  }
  if (currentState === 'loading' || currentState === 'loaded' || currentState === 'showing') {
    return;
  }

  currentState = 'loading';
  currentError = null;
  notify();

  try {
    const ad = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    currentAd = ad;

    const unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      if (currentAd === ad) {
        currentState = 'loaded';
        currentError = null;
        notify();
      }
    });

    const unsubscribeEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward: AdReward) => {
      if (pendingOnReward) {
        const cb = pendingOnReward;
        pendingOnReward = null;
        void cb(reward);
      }
    });

    const unsubscribeClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
      if (currentAd === ad) {
        currentAd = null;
        currentState = 'idle';
        notify();
        loadRewardedAd();
      }
    });

    const unsubscribeError = ad.addAdEventListener(AdEventType.ERROR, (error: any) => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
      if (currentAd === ad) {
        currentAd = null;
        currentState = 'error';
        currentError = error?.message ?? 'AD_LOAD_ERROR';
        notify();
      }
    });

    ad.load();
  } catch (err: any) {
    currentAd = null;
    currentState = 'error';
    currentError = err?.message ?? 'AD_INIT_ERROR';
    notify();
  }
}

export async function showRewardedAd(onReward: (reward: AdReward) => Promise<void> | void): Promise<boolean> {
  if (!currentAd || currentState !== 'loaded') {
    return false;
  }
  try {
    pendingOnReward = onReward;
    currentState = 'showing';
    notify();
    await currentAd.show();
    return true;
  } catch {
    pendingOnReward = null;
    currentState = 'idle';
    notify();
    loadRewardedAd();
    return false;
  }
}

export function useRewardedAd() {
  const [adInfo, setAdInfo] = useState(getAdState);

  useEffect(() => {
    void initAds().then(() => {
      loadRewardedAd();
    });
    const unsubscribe = subscribeAd(() => {
      setAdInfo(getAdState());
    });
    return unsubscribe;
  }, []);

  return {
    ...adInfo,
    showAd: showRewardedAd,
    reloadAd: loadRewardedAd,
  };
}
