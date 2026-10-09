import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

const backend = new URL(process.env.EXPO_PUBLIC_BACKEND_URL || 'https://wol.luiszamora.dev');
if (backend.protocol !== 'https:' || backend.username || backend.password) {
  throw new Error('EXPO_PUBLIC_BACKEND_URL debe ser HTTPS sin credenciales.');
}

export default function App() {
  const webView = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack || failed) return false;
      webView.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack, failed]);
  const retry = () => {
    setFailed(false); setLoading(true); setCanGoBack(false);
    setAttempt(value => value + 1);
  };
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Text style={styles.brand}>WoL Pro</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Recargar panel" onPress={retry}>
            <Text style={styles.action}>Recargar</Text>
          </Pressable>
        </View>
        <View style={styles.content}>
          {failed ? (
            <View style={styles.message}>
              <Text style={styles.title}>No pudimos cargar el panel</Text>
              <Text style={styles.description}>Comprueba tu conexión e inténtalo de nuevo.</Text>
              <Pressable accessibilityRole="button" onPress={retry} style={styles.button}>
                <Text style={styles.buttonText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : (
            <WebView key={attempt} ref={webView} source={{ uri: backend.href }} style={styles.content}
              originWhitelist={['https://*']} mixedContentMode="never"
              javaScriptCanOpenWindowsAutomatically={false} setSupportMultipleWindows={false}
              sharedCookiesEnabled thirdPartyCookiesEnabled={false}
              onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
              onLoadStart={() => setLoading(true)} onLoadEnd={() => setLoading(false)}
              onError={() => { setLoading(false); setFailed(true); }}
              onHttpError={event => {
                if (event.nativeEvent.statusCode >= 500) { setLoading(false); setFailed(true); }
              }}
              onContentProcessDidTerminate={retry}
              onShouldStartLoadWithRequest={request => {
                if (request.url === 'about:blank') return true;
                let target: URL;
                try { target = new URL(request.url); } catch { return false; }
                if (target.origin === backend.origin && !target.username && !target.password) return true;
                if (target.protocol === 'https:' || target.protocol === 'mailto:') {
                  void Linking.openURL(request.url).catch(() => undefined);
                }
                return false;
              }} />
          )}
          {loading && !failed && <View pointerEvents="none" style={styles.loading}><ActivityIndicator color="#38bdf8" /><Text style={styles.description}>Cargando panel…</Text></View>}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  brand: { color: '#f8fafc', fontSize: 22, fontWeight: '700' },
  action: { color: '#38bdf8', padding: 8 },
  content: { flex: 1 },
  message: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 16 },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '600', textAlign: 'center' },
  description: { color: '#94a3b8', textAlign: 'center' },
  button: { backgroundColor: '#38bdf8', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  buttonText: { color: '#0f172a', fontWeight: '700' },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', gap: 12 },
});
