import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ProductSubscription, Purchase } from 'expo-iap';
import type { AccountPlan, Device, MobileAction } from './mobileApi';

export type AccountRequest = (action: MobileAction) => Promise<Record<string, unknown>>;
type Props = { plan?: AccountPlan; devices: Device[]; busy: boolean; request: AccountRequest; onRefresh: () => void; onClose: () => void; onReward: () => void };

function Button({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button, disabled && s.disabled]}><Text style={s.buttonText}>{label}</Text></Pressable>;
}

function PlayStore({ plan, request }: { plan: AccountPlan; request: AccountRequest }) {
  const [products, setProducts] = useState<ProductSubscription[]>([]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // The native billing module is loaded only when Play purchases are configured.
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Native SDK stays unloaded until billing is enabled.
    const store: typeof import('expo-iap') = require('expo-iap');
    let disposed = false;
    const onPurchase = async (purchase: Purchase) => {
      try {
        if (purchase.purchaseState === 'pending') { if (!disposed) setError('El pago está pendiente. Premium se activará cuando Google confirme el pago.'); return; }
        if (!purchase.purchaseToken) throw new Error('Google no entregó un comprobante de compra.');
        const verified = await request({ kind: 'purchase', purchaseToken: purchase.purchaseToken });
        const verifiedPlan = verified.plan as AccountPlan | undefined;
        if (!verifiedPlan?.subscription || verifiedPlan.subscription.expires <= Date.now()/1000 || !['SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_CANCELED','SUBSCRIPTION_STATE_IN_GRACE_PERIOD'].includes(verifiedPlan.subscription.state)) throw new Error('La compra aún no tiene acceso confirmado. Intenta Restaurar compras cuando termine el pago.');
        await store.finishTransaction({ purchase, isConsumable: false });
        if (!disposed) setError(null);
      } catch (e) { if (!disposed) setError(e instanceof Error ? e.message : 'No se pudo verificar la compra. Usa Restaurar compras.'); }
      finally { if (!disposed) setWorking(false); }
    };
    const listener = store.purchaseUpdatedListener(purchase => { void onPurchase(purchase); });
    const errors = store.purchaseErrorListener(e => { if (!disposed) { setWorking(false); setError(e.code === 'user-cancelled' ? null : 'Google Play no pudo completar la compra.'); } });
    void store.initConnection().then(() => store.fetchProducts({ skus: plan.billing.products, type: 'subs' })).then(rows => {
      if (!disposed) setProducts((rows || []).filter((p): p is ProductSubscription => p.type === 'subs'));
    }).catch(() => { if (!disposed) setError('No se pudo consultar Google Play. Instala la app desde la prueba interna y vuelve a intentarlo.'); });
    return () => { disposed = true; listener.remove(); errors.remove(); void store.endConnection().catch(() => undefined); };
  }, [plan.billing.products.join(','), request]); // eslint-disable-line react-hooks/exhaustive-deps
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Same lazily loaded store module.
  const store = (): typeof import('expo-iap') => require('expo-iap');
  const restore = async () => {
    setWorking(true); setError(null);
    try {
      const purchases = await store().getAvailablePurchases();
      const own = purchases.filter(p => plan.billing.products.includes(p.productId));
      if (!own.length) throw new Error('Google Play no encontró suscripciones para restaurar en esta cuenta de Google.');
      for (const purchase of own) {
        if (!purchase.purchaseToken || purchase.purchaseState === 'pending') continue;
        const verified = await request({ kind: 'purchase', purchaseToken: purchase.purchaseToken });
        const verifiedPlan = verified.plan as AccountPlan | undefined;
        if (!verifiedPlan?.subscription || verifiedPlan.subscription.expires <= Date.now()/1000 || !['SUBSCRIPTION_STATE_ACTIVE','SUBSCRIPTION_STATE_CANCELED','SUBSCRIPTION_STATE_IN_GRACE_PERIOD'].includes(verifiedPlan.subscription.state)) continue;
        await store().finishTransaction({ purchase, isConsumable: false });
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron restaurar las compras.'); }
    finally { setWorking(false); }
  };
  return <View style={s.card}><Text style={s.title}>Suscripción con Google Play</Text>
    {error && <Text style={s.warning}>{error}</Text>}
    {plan.source !== 'google_play' && products.flatMap(product => product.platform === 'android' ? product.subscriptionOffers.filter(offer => offer.offerTokenAndroid && (plan.billing.intro_eligible || !offer.offerTagsAndroid?.includes('intro-year'))).map(offer => {
      const phases = offer.pricingPhasesAndroid?.pricingPhaseList || [];
      const price = phases.map(phase => `${phase.formattedPrice} / ${phase.billingPeriod === 'P1Y' ? 'año' : phase.billingPeriod === 'P1M' ? 'mes' : phase.billingPeriod}${phase.billingCycleCount ? ` (${phase.billingCycleCount} período${phase.billingCycleCount === 1 ? '' : 's'})` : ', renovación automática'}`).join('; después ');
      return <View key={product.id + offer.id} style={s.offer}><Text style={s.text}>{price || product.displayPrice}</Text><Button disabled={working} label="Elegir suscripción" onPress={() => Alert.alert('Confirmar suscripción', `${price || product.displayPrice}. Se renueva automáticamente hasta que la canceles en Google Play. El precio final y los impuestos se muestran antes del pago.`, [{ text: 'Volver', style: 'cancel' }, { text: 'Continuar', onPress: () => {
        setWorking(true); setError(null);
        void store().requestPurchase({ type: 'subs', request: { google: { skus: [product.id], obfuscatedAccountId: plan.billing.account_id, subscriptionOffers: [{ sku: product.id, offerToken: offer.offerTokenAndroid! }] } } }).catch(() => { setWorking(false); setError('No se pudo iniciar la compra.'); });
      } }])} /></View>;
    }) : [])}
    <Button disabled={working} label="Restaurar compras" onPress={() => { void restore(); }} />
    <Button disabled={working} label="Administrar suscripción" onPress={() => { void store().deepLinkToSubscriptions({}).catch(() => setError('Abre Suscripciones desde Google Play.')); }} />
  </View>;
}

export function PlanScreen({ plan, devices, busy, request, onRefresh, onClose, onReward }: Props) {
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now() / 1000), 30000); return () => clearInterval(timer); }, []);
  return <ScrollView contentContainerStyle={s.content}><Button label="← Cuenta" onPress={onClose} /><Text style={s.eyebrow}>TU CUENTA, EN TODOS TUS DISPOSITIVOS</Text><Text style={s.heading}>Mi plan</Text>
    {!plan ? <View style={s.card}><Text style={s.text}>Actualiza el servidor para consultar tus planes.</Text><Button label="Actualizar" onPress={onRefresh} disabled={busy} /></View> : <>
      <View style={s.card}><Text style={s.title}>{plan.tier === 'premium' ? 'Premium' : 'Free'}</Text><Text style={s.text}>{plan.registered_devices} equipos guardados · hasta {plan.device_limit} activos</Text><Text style={s.secondary}>Encendido mediante Alexa y apagado protegido. {plan.can_launch ? 'Aplicaciones y comandos autorizados disponibles.' : 'Las aplicaciones y los comandos requieren Premium.'}</Text>{plan.expires_at && <Text style={s.text}>Válido hasta {new Date(plan.expires_at * 1000).toLocaleString()}</Text>}{plan.subscription && <Text style={s.secondary}>{plan.subscription.auto_renew ? 'Renovación automática activada.' : 'Sin renovación automática.'} Acceso de la suscripción hasta {new Date(plan.subscription.expires * 1000).toLocaleString()}.</Text>}{plan.source === 'courtesy' && <Text style={s.secondary}>Acceso Premium de cortesía.</Text>}</View>
      <View style={s.card}><Text style={s.title}>Tu equipo principal en Free</Text><Text style={s.secondary}>Al vencer Premium conservamos los equipos y acciones. Elige cuál podrás controlar con Free.</Text>{devices.map(device => <Button key={device.id} disabled={busy} label={`${plan.active_devices.includes(device.id) ? '● ' : ''}${device.name}`} onPress={() => { void request({ kind: 'selectPlanDevice', deviceId: device.id }).catch(e => Alert.alert('Aviso', e.message)); }} />)}</View>
      <View style={s.card}><Text style={s.title}>Todo con Premium</Text><Text style={s.secondary}>Hasta 10 equipos. Abre aplicaciones, Spotify y comandos que autorices en Windows. Sin publicidad en la app y en la web.</Text></View>
      {plan.billing.enabled && Platform.OS === 'android' ? <PlayStore plan={plan} request={request} /> : <View style={s.card}><Text style={s.title}>Compras próximamente</Text><Text style={s.secondary}>Precios de referencia en USD: 2,99 al mes o 24,99 al año. Oferta prevista de 19,99 el primer año para cuentas elegibles; después, 24,99 al año. El precio de tu tienda se mostrará antes de pagar.</Text></View>}
      {plan.tier === 'free' && <View style={s.card}><Text style={s.title}>Una pausa sin publicidad</Text><Text style={s.secondary}>{plan.ad_free_until > now ? `Publicidad pausada hasta ${new Date(plan.ad_free_until * 1000).toLocaleTimeString()}.` : `Mira un video voluntario para obtener ${plan.ads.reward_minutes} minutos sin anuncios en tu cuenta. Mantienes las funciones de Free.`}</Text><Button disabled={busy || !plan.ads.enabled || !plan.ads.rewarded} label={`Ver video · ${plan.ads.reward_minutes} min sin anuncios`} onPress={onReward} /></View>}
      <Button disabled={busy} label="Actualizar mi plan" onPress={onRefresh} />
    </>}
  </ScrollView>;
}
const s = StyleSheet.create({ content: { padding: 22, gap: 16, paddingBottom: 40 }, eyebrow: { color: '#22d3ee', fontSize: 11, letterSpacing: 2 }, heading: { color: '#fff', fontSize: 32, fontWeight: '700' }, title: { color: '#fff', fontSize: 19, fontWeight: '600' }, text: { color: '#dbeafe', lineHeight: 23 }, secondary: { color: '#94a3b8', lineHeight: 22 }, warning: { color: '#fcd34d' }, card: { padding: 20, backgroundColor: '#162033', borderWidth: 1, borderColor: '#263449', borderRadius: 18, gap: 12 }, button: { padding: 14, backgroundColor: '#164e63', borderRadius: 12, alignItems: 'center' }, buttonText: { color: '#e0f2fe', fontWeight: '600' }, disabled: { opacity: 0.4 }, offer: { borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 16, gap: 10 } });
