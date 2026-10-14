const base = require('./app.json').expo;
module.exports = () => {
  const live = process.env.EXPO_PUBLIC_ADS_MODE === 'live';
  const platforms = (process.env.EXPO_PUBLIC_ADS_PLATFORMS || 'android,ios').split(',').map(value => value.trim());
  if (live && (platforms.some(value => !['android', 'ios'].includes(value)) || !platforms.length)) throw new Error('Selecciona android o ios en EXPO_PUBLIC_ADS_PLATFORMS.');
  const appIds = { android: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID, ios: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID };
  if (live && platforms.some(platform => !/^ca-app-pub-\d{16}~\d+$/.test(appIds[platform] || ''))) throw new Error('Configura el App ID real de AdMob de cada plataforma habilitada antes de compilar con anuncios live.');
  const units = { android: [process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER, process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL, process.env.EXPO_PUBLIC_ADMOB_ANDROID_REWARDED], ios: [process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER, process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL, process.env.EXPO_PUBLIC_ADMOB_IOS_REWARDED] };
  if (live && platforms.some(platform => units[platform].some(id => !/^ca-app-pub-\d{16}\/\d+$/.test(id || '')))) throw new Error('Configura banner, intersticial y recompensado de cada plataforma habilitada antes de compilar.');
  return { ...base, android: { ...base.android, blockedPermissions: live && platforms.includes('android') ? [] : ['com.google.android.gms.permission.AD_ID'] }, plugins: base.plugins.map(plugin => Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads' ? [plugin[0], { ...plugin[1], androidAppId: appIds.android || plugin[1].androidAppId, iosAppId: appIds.ios || plugin[1].iosAppId }] : plugin) };
};
