import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export const TEST_REWARDED_AD_UNIT = 'ca-app-pub-3940256099942544/5224354917';

export type AdReward = { amount: number; type: string };
export type AdState = 'idle' | 'loading' | 'loaded' | 'showing' | 'error';
export type ConsentState = {
  status: 'unknown' | 'required' | 'obtained' | 'not-required' | 'unavailable';
  canRequestAds: boolean;
  privacyOptionsRequired: boolean;
};

let RewardedAd: any = null;
let RewardedAdEventType: any = null;
let AdEventType: any = null;
let mobileAds: any = null;
let TestIds: any = null;
let AdsConsent: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const gma = require('react-native-google-mobile-ads');
  RewardedAd = gma.RewardedAd;
  RewardedAdEventType = gma.RewardedAdEventType;
  AdEventType = gma.AdEventType;
  AdsConsent = gma.AdsConsent;
  mobileAds = gma.default;
  TestIds = gma.TestIds;
} catch {
  // Fallback cuando el módulo nativo no existe (web o pruebas).
}

// Una unidad real se configura por entorno; mientras no exista se anuncian los de prueba
// de Google, que no generan ingresos pero permiten probar el flujo completo.
export const adUnitId: string =
  process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT ?? TestIds?.REWARDED ?? TEST_REWARDED_AD_UNIT;
export const adsConfigured = Boolean(process.env.EXPO_PUBLIC_ADMOB_REWARDED_UNIT);

let currentAd: any = null;
let currentState: AdState = 'idle';
let currentError: string | null = null;
let initialized = false;
let pendingOnReward: ((reward: AdReward) => Promise<void> | void) | null = null;
let consent: ConsentState = { status: 'unknown', canRequestAds: false, privacyOptionsRequired: false };
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) {
    try { listener(); } catch {}
  }
}

function readConsent(info: any): ConsentState {
  return {
    status: info?.status === 'OBTAINED' ? 'obtained' : info?.status === 'NOT_REQUIRED' ? 'not-required' : info?.status === 'REQUIRED' ? 'required' : 'unknown',
    canRequestAds: info?.canRequestAds === true,
    privacyOptionsRequired: info?.privacyOptionsRequirementStatus === 'REQUIRED',
  };
}

export function getAdState(): { state: AdState; isLoaded: boolean; error: string | null } {
  return { state: currentState, isLoaded: currentState === 'loaded', error: currentError };
}

export function getConsent(): ConsentState {
  return consent;
}

export function subscribeAd(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// Google exige una plataforma de consentimiento (UMP) en el EEE antes de pedir anuncios.
// Sin consentimiento no se carga ningún anuncio y la recompensa no puede obtenerse.
export async function requestConsent(): Promise<ConsentState> {
  if (Platform.OS === 'web' || !AdsConsent) {
    consent = { status: 'unavailable', canRequestAds: false, privacyOptionsRequired: false };
    notify();
    return consent;
  }
  try {
    await AdsConsent.requestInfoUpdate();
    const info = await AdsConsent.loadAndShowConsentFormIfRequired();
    consent = readConsent(info);
  } catch (error) {
    consent = { status: 'unavailable', canRequestAds: false, privacyOptionsRequired: false };
    console.warn('[Ads] Consent flow failed:', error);
  }
  notify();
  if (consent.canRequestAds) loadRewardedAd();
  return consent;
}

export async function showPrivacyOptions(): Promise<ConsentState> {
  if (Platform.OS === 'web' || !AdsConsent) return consent;
  try {
    consent = readConsent(await AdsConsent.showPrivacyOptionsForm());
  } catch (error) {
    console.warn('[Ads] Privacy options failed:', error);
  }
  notify();
  if (consent.canRequestAds) loadRewardedAd();
  return consent;
}

export async function initAds(): Promise<void> {
  if (Platform.OS === 'web' || !mobileAds) return;
  if (initialized) {
    if (consent.status === 'unknown') await requestConsent();
    return;
  }
  try {
    await mobileAds().initialize();
    initialized = true;
  } catch (e) {
    console.warn('[Ads] SDK initialization failed:', e);
    return;
  }
  await requestConsent();
}

export function loadRewardedAd(): void {
  if (Platform.OS === 'web' || !RewardedAd) {
    currentState = 'idle';
    return;
  }
  if (!consent.canRequestAds) {
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
  if (!consent.canRequestAds || !currentAd || currentState !== 'loaded') {
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
  const [consentInfo, setConsentInfo] = useState(getConsent);

  useEffect(() => {
    void initAds().then(() => {
      setConsentInfo(getConsent());
      loadRewardedAd();
    });
    const unsubscribe = subscribeAd(() => {
      setAdInfo(getAdState());
      setConsentInfo(getConsent());
    });
    return unsubscribe;
  }, []);

  return {
    ...adInfo,
    consent: consentInfo,
    showAd: showRewardedAd,
    reloadAd: loadRewardedAd,
    requestConsent: async () => { setConsentInfo(await requestConsent()); },
    showPrivacyOptions: async () => { setConsentInfo(await showPrivacyOptions()); },
  };
}
