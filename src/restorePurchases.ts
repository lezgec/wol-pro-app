import type { Purchase } from 'expo-iap';
import type { AccountPlan } from './mobileApi';

export function hasActivePlaySubscription(plan: AccountPlan | undefined): boolean {
  const subscription = plan?.subscription;
  return !!subscription && subscription.provider === 'google_play'
    && subscription.expires > Date.now() / 1000
    && ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_CANCELED', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'].includes(subscription.state);
}

export async function restorePlayPurchases({ purchases, products, verify, finish }: {
  purchases: Purchase[];
  products: string[];
  verify: (purchase: Purchase) => Promise<AccountPlan | undefined>;
  finish: (purchase: Purchase) => Promise<unknown>;
}): Promise<string> {
  const own = purchases.filter(purchase => products.includes(purchase.productId));
  if (!own.length) return 'Google Play no encontró suscripciones vigentes para restaurar en esta cuenta de Google.';

  let restored = 0;
  let pending = 0;
  let unavailable = 0;
  for (const purchase of own) {
    if (purchase.purchaseState === 'pending') { pending++; continue; }
    if (!purchase.purchaseToken) throw new Error('Google Play no entregó el comprobante para restaurar. Vuelve a intentarlo.');
    const plan = await verify(purchase);
    if (!plan?.subscription) throw new Error('El servidor no confirmó el estado de la suscripción. Vuelve a intentarlo.');
    if (!hasActivePlaySubscription(plan)) { unavailable++; continue; }
    // Never acknowledge a restored purchase until Azure confirms its entitlement.
    await finish(purchase);
    restored++;
  }

  const messages: string[] = [];
  if (restored) messages.push('Compra restaurada y verificada con Google Play. Premium está activo en tu cuenta. Si ya estaba activo, tu plan no cambia.');
  if (pending) messages.push('Hay un pago pendiente. Premium se activará cuando Google confirme el pago.');
  if (unavailable) messages.push('Hay suscripciones sin acceso vigente; no activan Premium.');
  return messages.join(' ');
}
