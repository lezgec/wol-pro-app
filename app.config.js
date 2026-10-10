const base = require('./app.json').expo;
module.exports = () => {
  const live = process.env.EXPO_PUBLIC_ADS_MODE === 'live';
  if (live && (!process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || !process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID)) throw new Error('Configura los App IDs reales de AdMob antes de compilar con anuncios live.');
  return { ...base, android: { ...base.android, blockedPermissions: live ? [] : ['com.google.android.gms.permission.AD_ID'] }, plugins: base.plugins.map(plugin => Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads' ? [plugin[0], { ...plugin[1], androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || plugin[1].androidAppId, iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || plugin[1].iosAppId }] : plugin) };
};
