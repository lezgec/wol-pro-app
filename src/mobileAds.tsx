import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import type { AccountPlan } from './mobileApi';
type AdsSdk = typeof import('react-native-google-mobile-ads');
let preparation: Promise<AdsSdk | null> | null = null;
let presenting = false;
let cachedInterstitial: import('react-native-google-mobile-ads').InterstitialAd | null = null;
let cachedAt = 0;
let warming = false;
let cacheGeneration = 0;
export const adsBuildEnabled = () => process.env.EXPO_PUBLIC_ADS_MODE === 'test' || (
  process.env.EXPO_PUBLIC_ADS_MODE === 'live' &&
  (process.env.EXPO_PUBLIC_ADS_PLATFORMS || 'android,ios').split(',').map((value: string) => value.trim()).includes(Platform.OS)
);
export const adsEligible = (plan?: AccountPlan) => !!plan && plan.tier === 'free' && plan.ads.enabled && plan.ad_free_until <= Date.now() / 1000 && adsBuildEnabled();
export const adPlacementAllowed = (plan: AccountPlan | undefined, format: 'banner' | 'rewarded' | 'interstitial', view: string) => adsEligible(plan) && !!plan?.ads[format] && plan.ads.allowed_views.includes(view);

function unit(sdk: AdsSdk, kind: 'banner' | 'rewarded' | 'interstitial') {
  if (process.env.EXPO_PUBLIC_ADS_MODE === 'test') return kind === 'banner' ? sdk.TestIds.BANNER : kind === 'rewarded' ? sdk.TestIds.REWARDED : sdk.TestIds.INTERSTITIAL;
  const platform = Platform.OS;
  if (platform === 'android') return kind === 'banner' ? process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER : kind === 'rewarded' ? process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED : process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL;
  return kind === 'banner' ? process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER : kind === 'rewarded' ? process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED : process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL;
}

async function prepare() {
  if (!adsBuildEnabled()) return null;
  if (!preparation) preparation = (async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Premium/off builds do not initialize the ad module.
    const sdk: AdsSdk = require('react-native-google-mobile-ads');
    const consent = await sdk.AdsConsent.gatherConsent();
    if (!consent.canRequestAds) { preparation = null; return null; }
    await sdk.default().setRequestConfiguration({ maxAdContentRating: sdk.MaxAdContentRating.G });
    await sdk.default().initialize();
    return sdk;
  })().catch(() => { preparation = null; return null; });
  return preparation;
}

export function clearInterstitial() {
  cacheGeneration++;
  cachedInterstitial?.destroy(); cachedInterstitial = null; cachedAt = 0;
}

export function interstitialReady() {
  if (cachedInterstitial && Date.now() - cachedAt >= 3600000) clearInterstitial();
  return !!cachedInterstitial?.loaded;
}

export async function prepareInterstitial() {
  if (warming || cachedInterstitial || !adsBuildEnabled()) return;
  warming = true;
  const generation = cacheGeneration;
  try {
    const sdk = await prepare();
    if (!sdk || generation !== cacheGeneration) return;
    const id = unit(sdk, 'interstitial');
    if (!id) return;
    const ad = sdk.InterstitialAd.createForAdRequest(id, { requestNonPersonalizedAdsOnly: true });
    cachedInterstitial = ad; cachedAt = Date.now();
    ad.addAdEventListener(sdk.AdEventType.ERROR, () => { if (cachedInterstitial === ad) clearInterstitial(); });
    ad.load();
  } catch { if (generation === cacheGeneration) clearInterstitial(); }
  finally { warming = false; }
}

export function MobileBanner({ plan }: { plan?: AccountPlan }) {
  const [sdk, setSdk] = useState<AdsSdk | null>(null);
  const allowed = adsEligible(plan) && !!plan?.ads.banner;
  useEffect(() => { let live = true; if (allowed) void prepare().then(value => { if (live) setSdk(value); }); return () => { live = false; }; }, [allowed]);
  if (!allowed || !sdk) return null;
  const id = unit(sdk, 'banner');
  if (!id) return null;
  const Banner = sdk.BannerAd;
  return <View style={{ alignItems: 'center' }}><Banner unitId={id} size={sdk.BannerAdSize.ANCHORED_ADAPTIVE_BANNER} requestOptions={{ requestNonPersonalizedAdsOnly: true }} /></View>;
}

export async function showFullscreen(format: 'rewarded' | 'interstitial', ticket: string, stillAllowed: () => boolean, beforeShow: () => Promise<boolean>): Promise<boolean> {
  if (presenting || !stillAllowed()) return false;
  presenting = true;
  try {
    const sdk = await prepare();
    if (!sdk) throw new Error('No se pudo preparar el video. Comprueba tu conexión y vuelve a intentarlo.');
    if (!stillAllowed()) return false;
    const id = unit(sdk, format);
    if (!id) throw new Error('Falta configurar el espacio de AdMob.');
    // An automatic ad must already be loaded at the navigation pause.
    // Never let a slow request interrupt a later task on the destination screen.
    if (format === 'interstitial' && !interstitialReady()) return false;
    const created = format === 'rewarded' ? sdk.RewardedAd.createForAdRequest(id, { requestNonPersonalizedAdsOnly: true, serverSideVerificationOptions: { customData: ticket } }) : cachedInterstitial!;
    if (format === 'interstitial') { cachedInterstitial = null; cachedAt = 0; }
    // Rewarded accepts the common events too; use its broader typed listener interface.
    const ad = created as import('react-native-google-mobile-ads').RewardedAd;
    return await new Promise<boolean>((resolve, reject) => {
      let earned = false;
      const timeout = setTimeout(() => { ad.destroy(); reject(new Error('No hay video disponible. Puedes seguir usando la app.')); }, 15000);
      let finished = false;
      const finish = (error?: Error) => { if (finished) return; finished = true; clearTimeout(timeout); ad.destroy(); if (error) reject(error); else resolve(earned); };
      ad.addAdEventListener(sdk.AdEventType.ERROR, () => finish(new Error('El anuncio no está disponible.')));
      ad.addAdEventListener(sdk.AdEventType.CLOSED, () => finish());
      if (format === 'rewarded') (ad as import('react-native-google-mobile-ads').RewardedAd).addAdEventListener(sdk.RewardedAdEventType.EARNED_REWARD, () => { earned = true; });
      const loaded = () => {
        clearTimeout(timeout);
        if (!stillAllowed()) { finish(); return; }
        // Refresh account policy immediately before showing; a purchase on another
        // device must also withdraw this placement. Google owns the close button.
        void beforeShow().then(allowed => { if (!allowed || !stillAllowed()) { finish(); return; } return ad.show(); }).catch(() => finish(new Error('No se pudo mostrar el anuncio.')));
      };
      if (format === 'rewarded') { ad.addAdEventListener(sdk.RewardedAdEventType.LOADED, loaded); ad.load(); }
      else loaded();
    });
  } finally { presenting = false; }
}

export async function adPrivacyOptions() {
  const sdk = await prepare();
  if (sdk) await sdk.AdsConsent.showPrivacyOptionsForm();
}
