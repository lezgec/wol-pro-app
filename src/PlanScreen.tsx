import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Alert, AppState, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ProductSubscription } from 'expo-iap';
import { isAccountPlan, type AccountPlan, type Device, type MobileAction } from './mobileApi';
import { restorePlayPurchases } from './restorePurchases';
import { subscriptionStatus } from './subscriptionStatus';
import { createPurchaseRecovery } from './purchaseRecovery';
import { adsBuildEnabled, adPlacementAllowed } from './mobileAds';

export type AccountRequest = (action: MobileAction) => Promise<Record<string, unknown>>;
type Props = { plan?: AccountPlan; devices: Device[]; busy: boolean; rewardBusy: boolean; accessReady: boolean; request: AccountRequest; onRefresh: () => void; onClose: () => void; onReward: () => void };

function Button({ label, onPress, disabled = false, primary = false, selected = false }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean; selected?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} style={[s.button, primary && s.primaryButton, selected && s.selectedButton, disabled && s.disabled]}><Text style={[s.buttonText, primary && s.primaryButtonText]}>{label}</Text></Pressable>;
}

function PlayStore({ plan, request, status, accessReady, busy }: { plan: AccountPlan; request: AccountRequest; status: string | null; accessReady: boolean; busy: boolean }) {
  const [products, setProducts] = useState<ProductSubscription[]>([]);
  const [working, setWorking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const productKeys = plan.billing.products.join(',');
  const [connectedProducts, setConnectedProducts] = useState<string | null>(null);
  const connected = connectedProducts === productKeys;
  const [syncing, setSyncing] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const readyRef = useRef(false);
  const availableRef = useRef(false);
  const recoveryRef = useRef<ReturnType<typeof createPurchaseRecovery> | null>(null);
  const scanRef = useRef<(() => Promise<void>) | null>(null);
  const needsScan = useRef(true);
  const disabled = working || syncing || busy || !accessReady || !connected;
  useLayoutEffect(() => {
    readyRef.current = accessReady && foreground;
    availableRef.current = !busy && !restoring;
  }, [accessReady, foreground, busy, restoring]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    // The native billing module is loaded only when Play purchases are configured.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Native SDK stays unloaded until billing is enabled.
    const store: typeof import('expo-iap') = require('expo-iap');
    let disposed = false;
    const recovery = createPurchaseRecovery({
      products: plan.billing.products,
      canProcess: () => !disposed && readyRef.current && AppState.currentState === 'active',
      verify: async purchase => {
        const verified = await request({ kind: 'purchase', purchaseToken: purchase.purchaseToken! });
        return verified.plan as AccountPlan | undefined;
      },
      finish: purchase => store.finishTransaction({ purchase, isConsumable: false }),
      onBusy: value => { if (!disposed) setSyncing(value); },
      onSuccess: () => { if (!disposed) { setWorking(false); setError(null); setNotice('Compra verificada. Premium está activo en tu cuenta.'); } },
      onPending: () => { if (!disposed) { setWorking(false); setNotice('El pago está pendiente. Premium se activará cuando Google confirme el pago.'); } },
      onError: e => { if (!disposed) { setWorking(false); setError(e.message); } },
    });
    recoveryRef.current = recovery;
    const listener = store.purchaseUpdatedListener(purchase => {
      recovery.enqueue(purchase);
      if (availableRef.current) void recovery.resume();
    });
    const errors = store.purchaseErrorListener(e => { if (!disposed) { setWorking(false); setError(e.code === 'user-cancelled' ? null : 'Google Play no pudo completar la compra.'); } });
    let scanning = false;
    scanRef.current = async () => {
      if (disposed || scanning || !readyRef.current || !availableRef.current) return;
      needsScan.current = false;
      scanning = true;
      try {
        const purchases = await store.getAvailablePurchases();
        if (disposed) return;
        purchases.forEach(recovery.enqueue);
        if (availableRef.current) await recovery.resume();
        if (!disposed) setWorking(false);
      } catch { if (!disposed && readyRef.current) { setWorking(false); setError('No se pudo confirmar la compra con Google Play. Usa Restaurar compras para reintentar.'); } }
      finally { scanning = false; }
    };
    void store.initConnection().then(() => {
      if (disposed) return [];
      setConnectedProducts(productKeys);
      return store.fetchProducts({ skus: plan.billing.products, type: 'subs' });
    }).then(rows => {
      if (!disposed) setProducts((rows || []).filter((p): p is ProductSubscription => p.type === 'subs'));
    }).catch(() => { if (!disposed) setError('No se pudo consultar Google Play. Instala la app desde la prueba interna y vuelve a intentarlo.'); });
    return () => { disposed = true; recovery.dispose(); recoveryRef.current = null; scanRef.current = null; listener.remove(); errors.remove(); void store.endConnection().catch(() => undefined); };
  }, [productKeys, request]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    needsScan.current = true;
  }, [accessReady, foreground, connected]);
  useEffect(() => {
    if (accessReady && foreground && connected && !busy && !restoring) {
      if (needsScan.current) void scanRef.current?.();
      else void recoveryRef.current?.resume();
    }
  }, [accessReady, foreground, connected, busy, restoring]);
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Same lazily loaded store module.
  const store = (): typeof import('expo-iap') => require('expo-iap');
  const restore = async () => {
    setWorking(true); setRestoring(true); setError(null); setNotice(null);
    try {
      // Refresh even when Play has no purchases, so an expired plan is not left on screen.
      await request({ kind: 'plan' });
      const purchases = await store().getAvailablePurchases();
      const message = await restorePlayPurchases({
        purchases, products: plan.billing.products,
        verify: async purchase => {
          const verified = await request({ kind: 'purchase', purchaseToken: purchase.purchaseToken! });
          return verified.plan as AccountPlan | undefined;
        },
        finish: purchase => store().finishTransaction({ purchase, isConsumable: false }),
      });
      setNotice(message);
      Alert.alert('Restaurar compras', message);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudieron restaurar las compras.';
      setError(message);
      Alert.alert('No se pudo restaurar', message);
    }
    finally { setWorking(false); setRestoring(false); }
  };
  return <View style={s.card}>
    <Text style={s.eyebrow}>PAGOS Y RENOVACIÓN</Text><Text style={s.title}>Tu suscripción</Text>
    <Text style={s.secondary}>Administrada por Google Play.</Text>
    {status && <View style={s.infoBox}><Text style={s.text}>{status}</Text></View>}
    {error && <View style={s.infoBox}><Text accessibilityRole="alert" style={s.warning}>{error}</Text></View>}
    {notice && <View style={s.infoBox}><Text accessibilityLiveRegion="polite" style={s.text}>{notice}</Text></View>}
    {syncing && <Text accessibilityLiveRegion="polite" style={s.secondary}>Verificando compra con Google Play…</Text>}
    {plan.source !== 'google_play' && products.flatMap(product => product.platform === 'android' ? product.subscriptionOffers.filter(offer => offer.offerTokenAndroid && (plan.billing.intro_eligible || !offer.offerTagsAndroid?.includes('intro-year'))).map(offer => {
      const phases = offer.pricingPhasesAndroid?.pricingPhaseList || [];
      const price = phases.map(phase => `${phase.formattedPrice} / ${phase.billingPeriod === 'P1Y' ? 'año' : phase.billingPeriod === 'P1M' ? 'mes' : phase.billingPeriod}${phase.billingCycleCount ? ` (${phase.billingCycleCount} período${phase.billingCycleCount === 1 ? '' : 's'})` : ', renovación automática'}`).join('; después ');
      return <View key={product.id + offer.id} style={s.offer}><Text style={s.text}>{price || product.displayPrice}</Text><Button primary disabled={disabled} label="Elegir suscripción" onPress={() => Alert.alert('Confirmar suscripción', `${price || product.displayPrice}. Se renueva automáticamente hasta que la canceles en Google Play. El precio final y los impuestos se muestran antes del pago.`, [{ text: 'Volver', style: 'cancel' }, { text: 'Continuar', onPress: () => {
        setWorking(true); setError(null); setNotice(null);
        void store().requestPurchase({ type: 'subs', request: { google: { skus: [product.id], obfuscatedAccountId: plan.billing.account_id, subscriptionOffers: [{ sku: product.id, offerToken: offer.offerTokenAndroid! }] } } }).catch(() => { setWorking(false); setError('No se pudo iniciar la compra.'); });
      } }])} /></View>;
    }) : [])}
    <Button disabled={disabled} label={restoring ? 'Consultando compras…' : 'Restaurar compras'} onPress={() => { void restore(); }} />
    <Button disabled={disabled} label="Administrar suscripción" onPress={() => { void store().deepLinkToSubscriptions({}).catch(() => setError('Abre Suscripciones desde Google Play.')); }} />
  </View>;
}

export function PlanScreen({ plan, devices, busy, rewardBusy, accessReady, request, onRefresh, onClose, onReward }: Props) {
  const [now, setNow] = useState(() => Date.now() / 1000);
  const [refreshingPlan, setRefreshingPlan] = useState(false);
  const freeDeviceId = devices.some(device => device.id === plan?.selected_device) ? plan?.selected_device : plan?.active_devices[0];
  const subscriptionNotice = subscriptionStatus(plan?.subscription, now, plan?.source !== 'google_play');
  const benefits = ['Encendido con Alexa y un Echo compatible', 'Apagado protegido con cuenta atrás', ...(plan?.can_launch ? ['Aplicaciones, Spotify y comandos autorizados', 'Sin anuncios en la app y en la web'] : ['Un equipo activo para Alexa y apagado'])];
  useEffect(() => { const timer = setInterval(() => setNow(Date.now() / 1000), 30000); return () => clearInterval(timer); }, []);
  const refreshPlan = async () => {
    setRefreshingPlan(true);
    try {
      const result = await request({ kind: 'plan' });
      if (!isAccountPlan(result.plan)) throw new Error('El servidor no devolvió un plan válido. Vuelve a intentarlo.');
      const fresh = result.plan;
      const details = [
        fresh.tier === 'premium' ? 'Tu cuenta tiene Premium.' : 'Tu cuenta tiene Free.',
        fresh.source === 'courtesy' ? 'Acceso Premium de cortesía.' : null,
        subscriptionStatus(fresh.subscription),
      ].filter(Boolean).join('\n\n');
      Alert.alert('Plan actualizado', details);
    } catch (e) { Alert.alert('No se pudo actualizar el plan', e instanceof Error ? e.message : 'Comprueba tu conexión y vuelve a intentarlo.'); }
    finally { setRefreshingPlan(false); }
  };
  return <ScrollView contentContainerStyle={s.content}>
    <Pressable accessibilityRole="button" onPress={onClose} style={s.back}><Text style={s.backText}>← Cuenta</Text></Pressable>
    <View style={s.intro}><Text style={s.eyebrow}>TU CUENTA</Text><Text style={s.heading}>Mi plan</Text><Text style={s.secondary}>Para la app, Alexa, la web y Windows.</Text></View>
    {!plan ? <View style={s.card}><Text style={s.text}>Actualiza el servidor para consultar tus planes.</Text><Button label="Actualizar" onPress={onRefresh} disabled={busy} /></View> : <>
      <View style={[s.card, s.planCard, plan.tier === 'premium' && s.premiumCard]}>
        <View style={s.planHeader}><View style={s.planName}><Text style={s.eyebrow}>PLAN ACTUAL</Text><Text style={s.planTitle}>{plan.tier === 'premium' ? 'Premium' : 'Free'}</Text></View>
          <View style={s.badge}><Text style={s.badgeText}>{plan.source === 'courtesy' ? 'Cortesía' : plan.source === 'google_play' ? 'Google Play' : plan.tier === 'free' ? 'Gratis' : 'Premium'}</Text></View>
        </View>
        <View style={s.stats}>
          <View style={s.stat}><Text style={s.statValue}>{plan.registered_devices}</Text><Text style={s.statLabel}>{plan.registered_devices === 1 ? 'Equipo guardado' : 'Equipos guardados'}</Text></View>
          <View style={s.stat}><Text style={s.statValue}>{plan.device_limit}</Text><Text style={s.statLabel}>Límite de activos</Text></View>
        </View>
        {!!plan.expires_at && <View style={s.validity}><Text style={s.statLabel}>{plan.expires_at > now ? 'Acceso válido hasta' : 'Fecha de acceso registrada'}</Text><Text style={s.date}>{new Date(plan.expires_at * 1000).toLocaleString()}</Text>{plan.expires_at <= now && <Text style={s.warning}>Actualiza el plan para comprobar su vigencia.</Text>}</View>}
        <Button primary disabled={busy || refreshingPlan} label={refreshingPlan ? 'Actualizando plan…' : 'Actualizar mi plan'} onPress={() => { void refreshPlan(); }} />
      </View>
      {plan.billing.enabled && Platform.OS === 'android' ? <PlayStore plan={plan} request={request} status={subscriptionNotice} accessReady={accessReady} busy={busy} /> : <View style={s.card}><Text style={s.title}>Compras próximamente</Text>{subscriptionNotice && <Text style={s.text}>{subscriptionNotice}</Text>}<Text style={s.secondary}>Precios de referencia en USD: 2,99 al mes o 24,99 al año. Oferta prevista de 19,99 el primer año para cuentas elegibles; después, 24,99 al año. El precio de tu tienda se mostrará antes de pagar.</Text></View>}
      <View style={s.card}><Text style={s.title}>Equipo principal en Free</Text><Text style={s.secondary}>Elige el equipo que controlarás con Free. Tus otros equipos y acciones se conservan.</Text>{!devices.length && <Text style={s.secondary}>Agrega un equipo en Dispositivos para elegirlo aquí.</Text>}{devices.map(device => <Button key={device.id} selected={freeDeviceId === device.id} disabled={busy} label={`${freeDeviceId === device.id ? '✓  ' : ''}${device.name}`} onPress={() => { void request({ kind: 'selectPlanDevice', deviceId: device.id }).then(() => Alert.alert('Equipo principal guardado', `${device.name} será tu equipo activo en Free.`)).catch(e => Alert.alert('Aviso', e.message)); }} />)}</View>
      <View style={s.card}><Text style={s.title}>Incluido en tu plan</Text>{benefits.map(benefit => <View key={benefit} style={s.benefit}><Text accessible={false} style={s.check}>✓</Text><Text style={[s.text, s.benefitText]}>{benefit}</Text></View>)}{plan.tier === 'free' && <Text style={s.secondary}>Premium amplía el límite a 10 equipos y permite aplicaciones y comandos, sin anuncios.</Text>}</View>
      {plan.tier === 'free' && <View style={s.card}>
        <Text style={s.title}>Una pausa sin publicidad</Text>
        <Text style={s.secondary}>{plan.ad_free_until > now ? `Publicidad pausada hasta ${new Date(plan.ad_free_until * 1000).toLocaleTimeString()}.` : !adsBuildEnabled() ? 'Los videos con recompensa aún no están disponibles en esta versión.' : !adPlacementAllowed(plan, 'rewarded', 'plan') ? 'Los videos con recompensa aún no están disponibles para tu cuenta.' : `Mira un video voluntario para obtener ${plan.ads.reward_minutes} minutos sin anuncios en tu cuenta. Mantienes las funciones de Free.`}</Text>
        <Button disabled={busy || rewardBusy || !accessReady || !adPlacementAllowed(plan, 'rewarded', 'plan')} label={rewardBusy ? 'Preparando video…' : `Ver video · ${plan.ads.reward_minutes} min sin anuncios`} onPress={onReward} />
      </View>}
    </>}
  </ScrollView>;
}
const s = StyleSheet.create({
  content: { padding: 20, gap: 20, paddingBottom: 40 },
  back: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }, backText: { color: '#67e8f9', fontSize: 15, fontWeight: '600' }, intro: { gap: 6 },
  eyebrow: { color: '#67e8f9', fontSize: 10, fontWeight: '600', letterSpacing: 1.6 }, heading: { color: '#f8fafc', fontSize: 34, fontWeight: '700' },
  title: { color: '#f8fafc', fontSize: 19, fontWeight: '600' }, text: { color: '#dbeafe', fontSize: 14, lineHeight: 22 }, secondary: { color: '#a7b7cc', fontSize: 13, lineHeight: 21 }, warning: { color: '#fcd34d', fontSize: 13, lineHeight: 21 },
  card: { padding: 20, backgroundColor: '#131f30', borderWidth: 1, borderColor: '#263449', borderRadius: 20, gap: 14 }, planCard: { gap: 20 }, premiumCard: { backgroundColor: '#102c35', borderColor: '#27606a' },
  planHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, planName: { gap: 6 }, planTitle: { color: '#f8fafc', fontSize: 30, fontWeight: '700' },
  badge: { backgroundColor: '#163e48', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 }, badgeText: { color: '#a5f3fc', fontSize: 12, fontWeight: '600' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, stat: { flexGrow: 1, flexBasis: 120, backgroundColor: '#0b1825', borderRadius: 14, padding: 14, gap: 4 }, statValue: { color: '#f8fafc', fontSize: 26, fontWeight: '700' }, statLabel: { color: '#a7b7cc', fontSize: 12, lineHeight: 18 },
  validity: { gap: 5 }, date: { color: '#e0f2fe', fontSize: 15, lineHeight: 23, fontWeight: '600' }, infoBox: { backgroundColor: '#0b1825', padding: 14, borderRadius: 12 },
  button: { minHeight: 48, padding: 14, backgroundColor: '#162d40', borderWidth: 1, borderColor: '#36546b', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: '#dbeafe', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  primaryButton: { backgroundColor: '#22d3ee', borderColor: '#22d3ee' }, primaryButtonText: { color: '#082f49', fontWeight: '700' }, selectedButton: { backgroundColor: '#103a43', borderColor: '#22d3ee' }, disabled: { opacity: 0.4 },
  benefit: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, check: { color: '#67e8f9', fontSize: 16, lineHeight: 22 }, benefitText: { flex: 1 }, offer: { borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 16, gap: 10 },
});
