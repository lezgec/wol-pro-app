import type { Purchase } from 'expo-iap';
import type { AccountPlan } from './mobileApi';
import { hasActivePlaySubscription } from './restorePurchases';

// Keep receipts in memory while the app is locked. Play supplies unfinished
// purchases again on connection/resume, including after a process restart.
export function createPurchaseRecovery({ products, canProcess, verify, finish, onBusy, onSuccess, onPending, onError }: {
  products: string[];
  canProcess: () => boolean;
  verify: (purchase: Purchase) => Promise<AccountPlan | undefined>;
  finish: (purchase: Purchase) => Promise<unknown>;
  onBusy: (busy: boolean) => void;
  onSuccess: () => void;
  onPending: () => void;
  onError: (error: Error) => void;
}) {
  const receipts = new Map<string, Purchase>();
  const completed = new Set<string>();
  let running: Promise<void> | null = null;
  let disposed = false;
  const enqueue = (purchase: Purchase) => {
    if (disposed || !products.includes(purchase.productId)) return;
    const key = purchase.purchaseToken || purchase.productId;
    if (!completed.has(key)) receipts.set(key, purchase);
  };
  const drain = async () => {
    onBusy(true);
    try {
      while (!disposed && canProcess() && receipts.size) {
        const [key, purchase] = receipts.entries().next().value!;
        try {
          if (purchase.purchaseState === 'pending') {
            receipts.delete(key); onPending(); continue;
          }
          if (!purchase.purchaseToken) throw new Error('Google Play no entregó un comprobante de compra.');
          const plan = await verify(purchase);
          // A lock may cancel the HTTP bridge, or arrive just after its response.
          // Retain the receipt and verify again after the next unlock.
          if (disposed || !canProcess()) return;
          if (!hasActivePlaySubscription(plan)) throw new Error('La compra aún no tiene acceso confirmado. Intenta Restaurar compras cuando termine el pago.');
          await finish(purchase);
          receipts.delete(key); completed.add(key);
          if (!disposed && canProcess()) onSuccess();
        } catch (error) {
          if (disposed || !canProcess()) return;
          receipts.delete(key);
          onError(error instanceof Error ? error : new Error('No se pudo verificar la compra. Usa Restaurar compras.'));
        }
      }
    } finally { onBusy(false); }
  };
  const resume = () => {
    if (disposed || !canProcess() || !receipts.size) return Promise.resolve();
    if (!running) running = drain().finally(() => { running = null; });
    return running;
  };
  return { enqueue, resume, dispose: () => { disposed = true; receipts.clear(); completed.clear(); } };
}
