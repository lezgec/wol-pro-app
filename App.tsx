import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { DevicesScreen } from './src/DevicesScreen';
import { isDeviceList, parseReply, requestScript, type Device, type DeviceList, type MobileAction } from './src/mobileApi';

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
  const [devices, setDevices] = useState<DeviceList | null>(null);
  const [native, setNative] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wakingId, setWakingId] = useState<number | null>(null);
  const sequence = useRef(0);
  const pending = useRef<{ id: number; action: MobileAction; automatic: boolean; timer: ReturnType<typeof setTimeout> } | null>(null);
  const managing = useRef(false);
  const cancelRequest = () => {
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
    setBusy(false); setWakingId(null);
  };
  useEffect(() => () => { if (pending.current) clearTimeout(pending.current.timer); }, []);
  const request = (action: MobileAction, automatic = false) => {
    if (pending.current || !webView.current) return;
    const id = ++sequence.current;
    setBusy(true);
    if (action.kind === 'wake') setWakingId(action.deviceId);
    const timer = setTimeout(() => {
      if (pending.current?.id !== id) return;
      cancelRequest();
      if (!automatic) Alert.alert('Conexión interrumpida', action.kind === 'wake'
        ? 'No se pudo confirmar el envío. La orden podría haberse enviado; no se reintentará automáticamente.'
        : 'No se pudieron actualizar tus equipos. Inténtalo de nuevo.');
    }, 15000);
    pending.current = { id, action, automatic, timer };
    webView.current.injectJavaScript(requestScript(backend.origin, id, action));
  };
  const showWeb = () => { managing.current = true; setNative(false); };
  const wake = (device: Device) => {
    if (!device.can_wake) {
      Alert.alert(device.wake_method === 'alexa' ? 'Encender con Alexa' : 'Revisar método de encendido',
        device.wake_method === 'alexa' ? `Di «Alexa, enciende ${device.name}» o usa la app Alexa.`
          : 'La red del servidor no alcanza tu casa. Selecciona Router por Internet o Alexa desde Administrar equipos.');
      return;
    }
    request({ kind: 'wake', deviceId: device.id });
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (native) { showWeb(); return true; }
      if (!canGoBack || failed) return false;
      webView.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack, failed, native]);
  const retry = () => {
    cancelRequest(); setNative(false); setDevices(null); managing.current = false;
    setFailed(false); setLoading(true); setCanGoBack(false);
    setAttempt(value => value + 1);
  };
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Text style={styles.brand}>WoL Pro</Text>
          <View style={styles.actions}>
            {!native && devices && <Pressable accessibilityRole="button" disabled={busy || loading} onPress={() => { managing.current = false; request({ kind: 'devices' }); }}><Text style={styles.action}>Equipos</Text></Pressable>}
            <Pressable accessibilityRole="button" disabled={busy} accessibilityLabel="Actualizar" onPress={() => native ? request({ kind: 'devices' }) : retry()}>
              <Text style={styles.action}>{native ? 'Actualizar' : 'Recargar'}</Text>
            </Pressable>
          </View>
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
            <WebView key={attempt} ref={webView} source={{ uri: backend.href }} style={native ? styles.hiddenWeb : styles.content}
              accessibilityElementsHidden={native} importantForAccessibility={native ? 'no-hide-descendants' : 'auto'}
              originWhitelist={['https://*']} mixedContentMode="never"
              javaScriptCanOpenWindowsAutomatically={false} setSupportMultipleWindows={false}
              sharedCookiesEnabled thirdPartyCookiesEnabled={false}
              onNavigationStateChange={state => {
                setCanGoBack(state.canGoBack);
                try {
                  if (new URL(state.url).pathname === '/login' || new URL(state.url).pathname === '/logout') {
                    cancelRequest(); setDevices(null); setNative(false); managing.current = false;
                  }
                } catch { /* Ignore incomplete navigation URLs. */ }
              }}
              onLoadStart={() => { cancelRequest(); setLoading(true); }}
              onLoadEnd={() => setLoading(false)}
              onLoad={event => {
                const url = new URL(event.nativeEvent.url);
                if (url.origin === backend.origin && url.pathname === '/' && !managing.current) request({ kind: 'devices' }, true);
              }}
              onMessage={event => {
                const reply = parseReply(event.nativeEvent.url, event.nativeEvent.data, backend.origin);
                if (!reply || reply.id !== pending.current?.id) return;
                const operation = pending.current;
                cancelRequest();
                if (reply.status === 401) {
                  setDevices(null); setNative(false); managing.current = false;
                  webView.current?.injectJavaScript(`location.href = '/login'; true;`);
                  return;
                }
                if (operation.action.kind === 'devices' && reply.status === 200 && isDeviceList(reply.body)) {
                  setDevices(reply.body); setNative(true); return;
                }
                const body = reply.body as { message?: unknown } | null;
                if (!operation.automatic) Alert.alert(operation.action.kind === 'wake' && reply.status === 200 ? 'Orden enviada' : 'Aviso',
                  typeof body?.message === 'string' ? body.message : 'No se pudo completar la operación. Puedes usar el panel web.');
              }}
              onError={() => { cancelRequest(); setNative(false); setLoading(false); setFailed(true); }}
              onHttpError={event => {
                if (event.nativeEvent.statusCode >= 500) { setLoading(false); setFailed(true); }
              }}
              onContentProcessDidTerminate={retry}
              onRenderProcessGone={retry}
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
          {native && devices && <DevicesScreen data={devices} busy={busy} wakingId={wakingId} refreshing={busy && wakingId === null}
            onRefresh={() => request({ kind: 'devices' })} onWake={wake} onManage={showWeb} />}
          {loading && !failed && !native && <View pointerEvents="none" style={styles.loading}><ActivityIndicator color="#38bdf8" /><Text style={styles.description}>Cargando panel…</Text></View>}
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
  actions: { flexDirection: 'row', alignItems: 'center' },
  hiddenWeb: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  content: { flex: 1 },
  message: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 16 },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '600', textAlign: 'center' },
  description: { color: '#94a3b8', textAlign: 'center' },
  button: { backgroundColor: '#38bdf8', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  buttonText: { color: '#0f172a', fontWeight: '700' },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', gap: 12 },
});
