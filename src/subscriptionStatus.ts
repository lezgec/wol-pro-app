import type { AccountPlan } from './mobileApi';

export function subscriptionStatus(subscription: AccountPlan['subscription'], now = Date.now() / 1000, showExpiry = true): string | null {
  if (!subscription) return null;
  if (subscription.state === 'SUBSCRIPTION_STATE_PENDING') return 'Pago pendiente. Premium se activará cuando Google confirme el pago.';
  if (subscription.state === 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED') return 'El pago pendiente fue cancelado. Esta compra no activa Premium.';
  if (subscription.state === 'SUBSCRIPTION_STATE_ON_HOLD') return 'Suscripción suspendida por un problema de pago. Revisa tu método de pago en Google Play.';
  if (subscription.state === 'SUBSCRIPTION_STATE_PAUSED') return 'Suscripción pausada. Puedes administrarla desde Google Play.';
  if (subscription.state === 'SUBSCRIPTION_STATE_EXPIRED') return 'Suscripción vencida. Esta compra ya no tiene acceso Premium.';
  if (!['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_CANCELED', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'].includes(subscription.state)
    || !Number.isFinite(subscription.expires) || subscription.expires <= 0) return 'Estado de la suscripción sin confirmar. Actualiza Mi plan para consultar su estado.';
  if (subscription.expires <= now) return 'La fecha de acceso registrada para la suscripción terminó. Actualiza Mi plan para comprobar una renovación.';
  const expiry = new Date(subscription.expires * 1000).toLocaleString();
  if (subscription.state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD') return showExpiry ? `Hay un problema con la renovación. Conservas el acceso hasta ${expiry}. Revisa el pago en Google Play.` : 'Hay un problema con la renovación. Conservas el acceso hasta la fecha indicada. Revisa el pago en Google Play.';
  const renewal = subscription.state === 'SUBSCRIPTION_STATE_CANCELED' || !subscription.auto_renew ? 'Sin renovación automática.' : 'Renovación automática activada.';
  return showExpiry ? `${renewal} Acceso de la suscripción hasta ${expiry}.` : `${renewal}${subscription.state === 'SUBSCRIPTION_STATE_CANCELED' ? ' Conservas el acceso hasta la fecha indicada.' : ''}`;
}
