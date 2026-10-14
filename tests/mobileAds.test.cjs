const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/mobileAds.tsx'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;

function harness({ mode = 'live', consent = true, earned = true, loadError = false, deferredLoad = false } = {}) {
  const ads = [];
  let initializations = 0;
  let now = 100000;
  class Ad {
    constructor(kind, id, options) { Object.assign(this, { kind, id, options, loaded: false, destroyed: false, shown: false }); this.listeners = new Map(); ads.push(this); }
    addAdEventListener(event, fn) { this.listeners.set(event, fn); }
    emit(event) { this.listeners.get(event)?.(); }
    load() { if (loadError) this.emit('error'); else if (!deferredLoad) { this.loaded = true; this.emit(this.kind === 'rewarded' ? 'reward-loaded' : 'loaded'); } }
    async show() { this.shown = true; if (earned && this.kind === 'rewarded') this.emit('earned'); this.emit('closed'); }
    destroy() { this.destroyed = true; }
  }
  const sdk = { default: () => ({ setRequestConfiguration: async () => {}, initialize: async () => { initializations++; } }), AdsConsent: { gatherConsent: async () => ({ canRequestAds: consent }) }, MaxAdContentRating: { G: 'G' }, AdEventType: { ERROR: 'error', CLOSED: 'closed', LOADED: 'loaded' }, RewardedAdEventType: { LOADED: 'reward-loaded', EARNED_REWARD: 'earned' }, TestIds: { BANNER: 'test-banner', INTERSTITIAL: 'test-interstitial', REWARDED: 'test-rewarded' } };
  sdk.InterstitialAd = { createForAdRequest: (id, options) => new Ad('interstitial', id, options) };
  sdk.RewardedAd = { createForAdRequest: (id, options) => new Ad('rewarded', id, options) };
  const exports = {};
  const env = { EXPO_PUBLIC_ADS_MODE: mode, EXPO_PUBLIC_ADS_PLATFORMS: 'android', EXPO_PUBLIC_ADMOB_ANDROID_BANNER: 'banner-unit', EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL: 'interstitial-unit', EXPO_PUBLIC_ADMOB_ANDROID_REWARDED: 'rewarded-unit' };
  vm.runInNewContext(source, { exports, process: { env }, Date: { now: () => now }, setTimeout, clearTimeout, require: name => ({ 'react': {}, 'react/jsx-runtime': {}, 'react-native': { Platform: { OS: 'android' } }, 'react-native-google-mobile-ads': sdk })[name] });
  return { api: exports, ads, initializations: () => initializations, advance: ms => { now += ms; } };
}
const plan = (extra = {}) => ({ tier: 'free', ad_free_until: 0, ads: { enabled: true, banner: true, interstitial: true, rewarded: true, allowed_views: ['home', 'plan'] }, ...extra });

test('Premium, off builds, server disabled and active pauses cannot show any placement', () => {
  const h = harness();
  for (const p of [plan({ tier: 'premium' }), plan({ ad_free_until: 200 }), plan({ ads: { ...plan().ads, enabled: false } })]) for (const format of ['banner', 'rewarded', 'interstitial']) assert.equal(h.api.adPlacementAllowed(p, format, 'home'), false);
  assert.equal(harness({ mode: 'off' }).api.adsEligible(plan()), false);
  assert.equal(h.initializations(), 0);
});
test('each placement respects its server switch and permitted screen', () => {
  const h = harness();
  for (const format of ['banner', 'rewarded', 'interstitial']) {
    assert.equal(h.api.adPlacementAllowed(plan(), format, 'home'), true);
    assert.equal(h.api.adPlacementAllowed(plan(), format, 'control'), false);
    assert.equal(h.api.adPlacementAllowed(plan({ ads: { ...plan().ads, [format]: false } }), format, 'home'), false);
  }
});
test('rewarded uses the configured unit and the server ticket for SSV', async () => {
  const h = harness();
  assert.equal(await h.api.showFullscreen('rewarded', 'server-ticket', () => true, async () => true), true);
  assert.equal(h.ads[0].id, 'rewarded-unit');
  assert.equal(h.ads[0].options.serverSideVerificationOptions.customData, 'server-ticket');
  assert.equal(h.ads[0].options.requestNonPersonalizedAdsOnly, true);
  assert.equal(h.ads[0].destroyed, true);
});
test('closing a video before earning does not report a reward', async () => {
  const h = harness({ earned: false });
  assert.equal(await h.api.showFullscreen('rewarded', 'ticket', () => true, async () => true), false);
});
test('an automatic ad is skipped unless preloaded, and then uses its configured unit', async () => {
  const h = harness();
  assert.equal(await h.api.showFullscreen('interstitial', 'ticket', () => true, async () => true), false);
  assert.equal(h.ads.length, 0);
  await h.api.prepareInterstitial();
  assert.equal(h.api.interstitialReady(), true);
  await h.api.showFullscreen('interstitial', 'ticket', () => true, async () => true);
  assert.equal(h.ads[0].id, 'interstitial-unit'); assert.equal(h.ads[0].shown, true);
  assert.equal(h.api.interstitialReady(), false);
});
test('a changed screen, lock or foreground guard cancels showing an already loaded ad', async () => {
  const h = harness(); await h.api.prepareInterstitial();
  let allowed = true;
  await h.api.showFullscreen('interstitial', 'ticket', () => allowed, async () => { allowed = false; return true; });
  assert.equal(h.ads[0].shown, false); assert.equal(h.ads[0].destroyed, true);
});
test('new Premium or a PC order discovered before showing withdraws the placement', async () => {
  const h = harness(); await h.api.prepareInterstitial();
  await h.api.showFullscreen('interstitial', 'ticket', () => true, async () => false);
  assert.equal(h.ads[0].shown, false); assert.equal(h.ads[0].destroyed, true);
});
test('policy withdrawal destroys cached inventory and expired inventory is never shown', async () => {
  const h = harness(); await h.api.prepareInterstitial(); h.api.clearInterstitial();
  assert.equal(h.ads[0].destroyed, true); assert.equal(h.api.interstitialReady(), false);
  await h.api.prepareInterstitial(); h.advance(3600001);
  assert.equal(h.api.interstitialReady(), false); assert.equal(h.ads[1].destroyed, true);
});
test('denied consent and loading errors leave the app usable without an ad', async () => {
  const denied = harness({ consent: false }); await denied.api.prepareInterstitial();
  assert.equal(denied.initializations(), 0); assert.equal(denied.ads.length, 0);
  await assert.rejects(denied.api.showFullscreen('rewarded', 'ticket', () => true, async () => true), /preparar el video/);
  const error = harness({ loadError: true }); await error.api.prepareInterstitial();
  assert.equal(error.api.interstitialReady(), false);
  await assert.rejects(error.api.showFullscreen('rewarded', 'ticket', () => true, async () => true), /no está disponible/);
});
