import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, ActivityIndicator, Alert, BackHandler, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';
import { Slot, router, usePathname } from 'expo-router';
import { PlanScreen } from './src/PlanScreen';
import { MobileBanner, adsEligible, showFullscreen, adPrivacyOptions } from './src/mobileAds';
import { ControlScreen } from './src/ControlScreen';
import { PairEditor } from './src/PairEditor';
import { useBiometricLock } from './src/useBiometricLock';
import { NativeShell, type Tab } from './src/NativeShell';
import { DeviceEditor } from './src/DeviceEditor';
import { isAccountPlan, isControlData, type ControlData, isDeviceList, parseReply, requestScript, type Device, type DeviceList, type MobileAction } from './src/mobileApi';

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
  const sessionStarted = useRef(Date.now());
  const planRef = useRef(devices?.plan); planRef.current = devices?.plan;
  const hasPendingCommands = useRef(false);
  const [busy, setBusy] = useState(false);
  const pathname = usePathname();
  const tab: Tab = pathname === '/devices' ? 'devices' : pathname === '/control' ? 'control' : (pathname === '/account' || pathname === '/plan') ? 'account' : 'home';
  const setTab = (value: Tab) => {
    const naturalPause = tab === 'devices' && value === 'home' && Date.now() - sessionStarted.current >= 600000;
    router.replace(value === 'home' ? '/' : `/${value}`);
    if (naturalPause && !busy && !hasPendingCommands.current && adsEligible(planRef.current) && planRef.current?.ads.interstitial) {
      void requestAccount({ kind: 'adTicket', format: 'interstitial' }).then(data => typeof data.ticket === 'string' ? showFullscreen('interstitial', data.ticket, () => accessRef.current && !pending.current && !hasPendingCommands.current && adsEligible(planRef.current), () => requestAccount({ kind: 'plan' }).then(fresh => isAccountPlan(fresh.plan) && adsEligible(fresh.plan))) : false).catch(() => undefined);
    }
  };
  const lock = useBiometricLock();
  const [control, setControl] = useState<ControlData | null>(null);
  hasPendingCommands.current = !!control?.pcs.some(pc => pc.commands.some(c => ['pending','claimed','scheduled'].includes(c.status)));
  const [controlError, setControlError] = useState<string | null>(null);
  const [selectedPc, setSelectedPc] = useState<number | null>(null);
  const [pairing, setPairing] = useState<Device | null>(null);
  const pairingRef = useRef<Device | null>(null);
  pairingRef.current = pairing;
  const requestRef = useRef<(action: MobileAction, automatic?: boolean) => void>(() => {});
  const accessRef = useRef(false);
  const needsUnlockRefresh = useRef(true);
  accessRef.current = lock.ready && !lock.locked;
  useEffect(() => {
    if (lock.locked) { accountRequestRef.current?.reject(new Error('Desbloquea la app para continuar.')); accountRequestRef.current = null; if (pending.current) clearTimeout(pending.current.timer); pending.current = null; setBusy(false); }
  }, [lock.locked]);
  useEffect(() => {
    if (lock.locked) needsUnlockRefresh.current = true;
    else if (lock.ready && !loading && needsUnlockRefresh.current) {
      needsUnlockRefresh.current = false;
      requestRef.current({ kind: native && tab === 'control' ? 'control' : 'devices' }, true);
    }
  }, [lock.locked, lock.ready, loading, native, tab]);
  useEffect(() => {
    if (!native || tab !== 'control' || !lock.ready || lock.locked) return;
    requestRef.current({ kind: 'control' }, true);
    const timer = setInterval(() => { if (AppState.currentState === 'active') requestRef.current({ kind: 'control' }, true); }, 5000);
    return () => clearInterval(timer);
  }, [native, tab, lock.ready, lock.locked]);
  useEffect(() => {
    if (!native || !lock.ready || lock.locked) return;
    const timer = setInterval(() => { if (AppState.currentState === 'active') requestRef.current({ kind: 'plan' }, true); }, 60000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') requestRef.current({ kind: 'plan' }, true); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [native, lock.ready, lock.locked]);
  const [editing, setEditing] = useState<Device | 'new' | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const sequence = useRef(0);
  const pending = useRef<{ id: number; action: MobileAction; automatic: boolean; timer: ReturnType<typeof setTimeout> } | null>(null);
  const managing = useRef(false);
  const accountRequestRef = useRef<{ resolve: (data: Record<string, unknown>) => void; reject: (error: Error) => void } | null>(null);
  const requestAccount = useCallback((action: MobileAction) => new Promise<Record<string, unknown>>((resolve, reject) => {
    if (!accessRef.current || !webView.current || (pending.current && !pending.current.automatic) || accountRequestRef.current) { reject(new Error('Espera a que termine la operación actual.')); return; }
    accountRequestRef.current = { resolve, reject };
    requestRef.current(action);
    if (!pending.current) { accountRequestRef.current = null; reject(new Error('No se pudo enviar la solicitud.')); }
  }), []);
  const cancelRequest = () => {
    accountRequestRef.current?.reject(new Error('La conexión se interrumpió. Actualiza Mi plan o restaura la compra para confirmar el resultado.'));
    accountRequestRef.current = null;
    if (pending.current) clearTimeout(pending.current.timer);
    pending.current = null;
    setBusy(false);
  };
  useEffect(() => () => { if (pending.current) clearTimeout(pending.current.timer); }, []);
  const request = (action: MobileAction, automatic = false) => {
    if (!accessRef.current || !webView.current) return;
    // A background status read must not swallow a confirmed user action.
    if (pending.current?.automatic && !automatic) { clearTimeout(pending.current.timer); pending.current = null; setBusy(false); }
    if (pending.current) return;
    const id = ++sequence.current;
    // Automatic reads keep the current screen and controls stable.
    setBusy(!automatic);
    const timer = setTimeout(() => {
      if (pending.current?.id !== id) return;
      cancelRequest();
      if (action.kind === 'create' || action.kind === 'update') {
        setEditorError('No pudimos confirmar si se guardó. Cierra este formulario y actualiza tus dispositivos antes de reintentar.');
        return;
      }
      if (action.kind === 'control') { setControlError('No se pudo actualizar el estado. Revisa tu conexión; se conserva la última información recibida.'); return; }
      if (!automatic) Alert.alert('Conexión interrumpida', action.kind === 'run' || action.kind === 'cancel' || action.kind === 'pair' || action.kind === 'saveAction' || action.kind === 'revoke' || action.kind === 'delete' || action.kind === 'deleteAction' || action.kind === 'wake'
        ? 'No se pudo confirmar el envío. La orden podría haberse enviado; no se reintentará automáticamente.'
        : 'No se pudieron actualizar tus equipos. Inténtalo de nuevo.');
    }, 15000);
    pending.current = { id, action, automatic, timer };
    webView.current.injectJavaScript(requestScript(backend.origin, id, action));
  };
  requestRef.current = request;
  const alexaInstructions = (device?: Device) => {
    Alert.alert(device ? 'Encender con Alexa' : 'Conecta con Alexa', device
      ? `Di «Alexa, enciende ${device.name}» o usa la app Alexa. Tu Echo debe estar en la misma red que el equipo y Wake-on-LAN debe estar habilitado.`
      : '1. Abre la app Alexa y busca la skill WoL Pro.\n2. Vincula tu cuenta de WoL Pro.\n3. Pide a Alexa que descubra dispositivos.\n4. Di «Alexa, enciende Escritorio».\n\nEl Echo debe estar en la misma red que el equipo.');
  };
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (native) { if (tab !== 'home') { setTab('home'); return true; } return false; }
      if (!canGoBack || failed) return false;
      webView.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack, failed, native, tab]);
  const retry = () => {
    cancelRequest(); setNative(false); setDevices(null); setEditing(null); setTab('home'); managing.current = false;
    setControl(null); setControlError(null); setPairing(null);
    setFailed(false); setLoading(true); setCanGoBack(false);
    setAttempt(value => value + 1);
  };
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <Slot />
        <StatusBar style="light" />
        <View style={styles.header}>
          <View style={styles.actions}><Image source={require('./assets/icon.png')} style={styles.logo} /><Text style={styles.brand}>WoL <Text style={styles.accent}>Pro</Text></Text></View>
          <View style={styles.actions}>
            {!native && devices && <Pressable accessibilityRole="button" disabled={busy || loading} onPress={() => { managing.current = false; request({ kind: 'devices' }); }}><Text style={styles.action}>Equipos</Text></Pressable>}
            <Pressable accessibilityRole="button" disabled={busy} accessibilityLabel="Actualizar" onPress={() => native ? request({ kind: tab === 'control' ? 'control' : 'devices' }) : retry()}>
              <Text style={styles.action}>{native ? 'Actualizar' : 'Recargar'}</Text>
            </Pressable>
          </View>
        </View>
        {lock.ready && <View pointerEvents={lock.locked ? 'none' : 'auto'} accessibilityElementsHidden={lock.locked} importantForAccessibility={lock.locked ? 'no-hide-descendants' : 'auto'} style={styles.content}>
          {failed ? (
            <View style={styles.message}>
              <Text style={styles.title}>No pudimos cargar el panel</Text>
              <Text style={styles.description}>Comprueba tu conexión e inténtalo de nuevo.</Text>
              <Pressable accessibilityRole="button" onPress={retry} style={styles.button}>
                <Text style={styles.buttonText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : (
            <View pointerEvents={native ? 'none' : 'auto'} style={native ? styles.hiddenWeb : styles.content}>
            <WebView key={attempt} ref={webView} source={{ uri: backend.href }} style={styles.content}
              accessibilityElementsHidden={native} importantForAccessibility={native ? 'no-hide-descendants' : 'auto'}
              originWhitelist={['https://*']} mixedContentMode="never"
              javaScriptCanOpenWindowsAutomatically={false} setSupportMultipleWindows={false}
              sharedCookiesEnabled thirdPartyCookiesEnabled={false}
              onNavigationStateChange={state => {
                setCanGoBack(state.canGoBack);
                try {
                  if (new URL(state.url).pathname === '/login' || new URL(state.url).pathname === '/logout') {
                    cancelRequest(); setDevices(null); setNative(false); setEditing(null); setTab('home'); managing.current = false;
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
                if (!accessRef.current || !reply || reply.id !== pending.current?.id) return;
                const operation = pending.current;
                const accountCall = accountRequestRef.current; accountRequestRef.current = null;
                cancelRequest();
                const accountBody = reply.body as Record<string, unknown> | null;
                if (accountCall) {
                  if (reply.status >= 200 && reply.status < 300 && accountBody) accountCall.resolve(accountBody);
                  else accountCall.reject(new Error(typeof accountBody?.message === 'string' ? accountBody.message : 'No se pudo completar la operación.'));
                }
                if (accountBody && isAccountPlan(accountBody.plan)) {
                  const plan = accountBody.plan;
                  setDevices(previous => previous ? { ...previous, plan } : previous);
                }
                if (['plan','selectPlanDevice','purchase','adTicket'].includes(operation.action.kind) && reply.status !== 401) {
                  if (operation.action.kind === 'selectPlanDevice' && reply.status === 200) requestRef.current({ kind: 'devices' }, true);
                  return;
                }
                if (reply.status === 401) {
                  setDevices(null); setControl(null); setPairing(null); setNative(false); setEditing(null); setTab('home'); managing.current = false;
                  webView.current?.injectJavaScript(`location.href = '/login'; true;`);
                  return;
                }
                if (operation.action.kind === 'logout' && reply.status === 200) {
                  setDevices(null); setControl(null); setPairing(null); setNative(false); setTab('home');
                  webView.current?.injectJavaScript(`location.href = '/login'; true;`);
                  return;
                }
                if ((operation.action.kind === 'devices' || operation.action.kind === 'create' || operation.action.kind === 'update' || operation.action.kind === 'delete' || operation.action.kind === 'remember')
                  && (reply.status === 200 || reply.status === 201) && isDeviceList(reply.body)) {
                  setDevices(reply.body); setNative(true);
                  if (operation.action.kind === 'remember') Alert.alert('Acceso rápido', reply.body.remembered ? 'Tu sesión se conservará hasta 30 días. Puedes proteger el acceso con biometría.' : 'La sesión dejará de conservarse al cerrar la app.');
                  else if (operation.action.kind !== 'devices') { setEditing(null); setEditorError(null); setTab('devices'); }
                  return;
                }
                if (operation.action.kind === 'control') {
                  if (reply.status === 200 && isControlData(reply.body)) { setControl(reply.body); setControlError(null); }
                  else { setControlError('No pudimos actualizar el control de PC. Revisa tu conexión; se conserva la última información recibida.'); }
                  return;
                }
                if (operation.action.kind === 'pairPreview' && reply.status === 200 && pairingRef.current) {
                  const body = reply.body as { computer_name?: unknown };
                  const device = pairingRef.current;
                  const code = operation.action.code;
                  if (typeof body?.computer_name !== 'string') return;
                  Alert.alert('Confirmar vinculación', `El código ${code} corresponde a «${body.computer_name}». ¿Vincularlo como «${device.name}»?`, [
                    { text: 'Volver', style: 'cancel' }, { text: 'Vincular', onPress: () => requestRef.current({ kind: 'pair', deviceId: device.id, code }) },
                  ]);
                  return;
                }
                if (['run', 'cancel', 'pair', 'revoke', 'saveAction', 'deleteAction'].includes(operation.action.kind) && reply.status >= 200 && reply.status < 300) {
                  if (operation.action.kind === 'pair') setPairing(null);
                  const body = reply.body as { message?: unknown };
                  Alert.alert('Solicitud recibida', typeof body?.message === 'string' ? body.message : 'Operación completada.');
                  requestRef.current({ kind: 'control' }, true);
                  return;
                }
                const body = reply.body as { message?: unknown } | null;
                if (operation.action.kind === 'create' || operation.action.kind === 'update') {
                  setEditorError(typeof body?.message === 'string' ? body.message : 'No se pudo guardar. Inténtalo de nuevo.'); return;
                }
                if (operation.action.kind === 'run' && reply.status === 0) {
                  Alert.alert('Resultado sin confirmar', 'La orden podría haberse recibido. Consulta el historial antes de volver a enviarla.'); return;
                }
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
            </View>
          )}
          {native && devices && <NativeShell showPlan={pathname === '/plan'} onPlan={() => router.push('/plan')}
            banner={!lock.locked && devices.plan?.ads.allowed_views?.includes(pathname === '/plan' ? 'plan' : tab) && <MobileBanner plan={devices.plan} />}
            onAdPrivacy={() => { void adPrivacyOptions().catch(() => Alert.alert('Aviso', 'No se pudieron abrir las opciones de publicidad.')); }}
            planScreen={<PlanScreen plan={devices.plan} devices={devices.devices} busy={busy} request={requestAccount} onRefresh={() => request({ kind: 'devices' })} onClose={() => router.replace('/account')} onReward={() => {
              if (!adsEligible(planRef.current) || hasPendingCommands.current) { Alert.alert('Aviso', 'Espera a que terminen las órdenes del PC antes de ver el video.'); return; }
              void requestAccount({ kind: 'adTicket', format: 'rewarded' }).then(async data => {
                if (typeof data.ticket !== 'string') return;
                const earned = await showFullscreen('rewarded', data.ticket, () => accessRef.current && !pending.current && !hasPendingCommands.current && adsEligible(planRef.current), () => requestAccount({ kind: 'plan' }).then(fresh => isAccountPlan(fresh.plan) && adsEligible(fresh.plan)));
                if (earned) Alert.alert('Video completado', 'Estamos verificando tu recompensa. Actualiza Mi plan para ver los 30 minutos sin publicidad.');
                requestRef.current({ kind: 'devices' }, true);
              }).catch(e => Alert.alert('Video no disponible', e.message));
            }} />}
            data={devices} tab={tab} onTab={setTab} busy={busy}
            onRefresh={() => request({ kind: tab === 'control' ? 'control' : 'devices' })} onAlexa={alexaInstructions}
            onAdd={() => { setEditorError(null); setEditing('new'); }}
            onEdit={device => { setEditorError(null); setEditing(device); }}
            onLogout={() => request({ kind: 'logout' })} backend={backend.origin}
            biometricEnabled={lock.enabled} biometricBusy={lock.working} onBiometric={() => { void lock.toggle(); }}
            onRemember={() => request({ kind: 'remember', enabled: !devices.remembered })}
            onControl={device => { setSelectedPc(device.id); setTab('control'); }}
            onDelete={device => Alert.alert('Eliminar equipo', `Se eliminará «${device.name}» y su vinculación con el agente.`, [{ text: 'Volver', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => request({ kind: 'delete', deviceId: device.id }) }])}
            controlScreen={<ControlScreen plan={devices.plan} onPlan={() => router.push('/plan')} devices={devices.devices} data={control} selected={selectedPc} onSelect={setSelectedPc} busy={busy} refreshing={busy && pending.current?.action.kind === 'control'} error={controlError} onRefresh={() => request({ kind: 'control' })} onRequest={request} onPair={setPairing} />} />}
          {!lock.locked && native && pairing && <PairEditor device={pairing} busy={busy} onClose={() => setPairing(null)} onPreview={code => request({ kind: 'pairPreview', code })} />}
          {!lock.locked && native && editing && <DeviceEditor key={editing === 'new' ? 'new' : editing.id} device={editing} busy={busy} error={editorError}
            onClose={() => { setEditing(null); setEditorError(null); }}
            onSave={(name, mac) => { setEditorError(null); request(editing === 'new' ? { kind: 'create', name, mac } : { kind: 'update', deviceId: editing.id, name, mac }); }} />}
          {loading && !failed && !native && <View pointerEvents="none" style={styles.loading}><ActivityIndicator color="#38bdf8" /><Text style={styles.description}>Cargando panel…</Text></View>}
        </View>}
        {(!lock.ready || lock.locked) && <View style={styles.lock} accessibilityViewIsModal>
          <Image source={require('./assets/icon.png')} style={{ width: 88, height: 88, borderRadius: 24 }} />
          <Text style={styles.title}>Tu acceso a WoL Pro</Text>
          <Text style={styles.description}>{lock.ready ? 'Desbloquea con biometría o el código de tu teléfono para continuar.' : 'Preparando acceso seguro…'}</Text>
          <Pressable accessibilityRole="button" disabled={lock.working} style={styles.button} onPress={() => { void lock.unlock(); }}><Text style={styles.buttonText}>{lock.working ? 'Verificando…' : lock.ready ? 'Desbloquear' : 'Reintentar'}</Text></Pressable>
        </View>}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  lock: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 30, gap: 24, zIndex: 100 },
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
  brand: { color: '#f8fafc', fontSize: 22, fontWeight: '700' },
  accent: { color: '#22d3ee' }, logo: { width: 34, height: 34, borderRadius: 10, marginRight: 10 },
  action: { color: '#38bdf8', padding: 8 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  hiddenWeb: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0 },
  content: { flex: 1 },
  message: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 16 },
  title: { color: '#f8fafc', fontSize: 22, fontWeight: '600', textAlign: 'center' },
  description: { color: '#94a3b8', textAlign: 'center' },
  button: { backgroundColor: '#38bdf8', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  buttonText: { color: '#0f172a', fontWeight: '700' },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', gap: 12 },
});
