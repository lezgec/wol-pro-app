export type AccountPlan = { tier: 'free' | 'premium'; device_limit: number; can_launch: boolean; expires_at: number | null; source: string; registered_devices: number; active_devices: number[]; selected_device: number | null; ad_free_until: number; ads: { enabled: boolean; banner: boolean; interstitial: boolean; rewarded: boolean; web: boolean; reward_minutes: number; interval_seconds: number; daily_limit: number; allowed_views: string[] }; subscription?: { provider: string; product: string; state: string; expires: number; auto_renew: number } | null; billing: { enabled: boolean; provider: string; account_id: string | null; products: string[]; intro_eligible: boolean; reference_prices: { currency: string; monthly: string; yearly: string; intro_year: string } } };
export function isAccountPlan(value: unknown): value is AccountPlan {
  if (!value || typeof value !== 'object') return false;
  const p = value as AccountPlan;
  return (p.tier === 'free' || p.tier === 'premium') && Number.isSafeInteger(p.device_limit) && p.device_limit > 0 && typeof p.can_launch === 'boolean' && typeof p.source === 'string'
    && (p.expires_at === null || Number.isFinite(p.expires_at)) && Number.isSafeInteger(p.registered_devices) && Array.isArray(p.active_devices) && p.active_devices.every(id => Number.isSafeInteger(id) && id > 0)
    && Number.isFinite(p.ad_free_until) && !!p.ads && ['enabled','banner','interstitial','rewarded','web'].every(key => typeof (p.ads as unknown as Record<string, unknown>)[key] === 'boolean') && Number.isFinite(p.ads.reward_minutes) && Number.isFinite(p.ads.interval_seconds) && Number.isFinite(p.ads.daily_limit)
    && Array.isArray(p.ads.allowed_views) && p.ads.allowed_views.every(view => typeof view === 'string')
    && !!p.billing && typeof p.billing.enabled === 'boolean' && Array.isArray(p.billing.products) && p.billing.products.every(id => typeof id === 'string') && (p.billing.account_id === null || typeof p.billing.account_id === 'string') && !!p.billing.reference_prices;
}
export type Device = { id: number; name: string; mac: string; wake_method: string; can_wake: boolean; plan_active?: boolean; agent_state?: 'ready' | 'connected' | 'offline' | 'unlinked' };
export type DeviceList = { version: 1; email: string | null; devices: Device[]; alexa_ready?: boolean; remembered?: boolean; plan?: AccountPlan };
export type MobileAction = { kind: 'plan' } | { kind: 'selectPlanDevice'; deviceId: number } | { kind: 'purchase'; purchaseToken: string } | { kind: 'adTicket'; format: 'rewarded' | 'interstitial' } | { kind: 'devices' } | { kind: 'wake'; deviceId: number }
  | { kind: 'create'; name: string; mac: string }
  | { kind: 'update'; deviceId: number; name: string; mac: string }
  | { kind: 'delete'; deviceId: number }
  | { kind: 'remember'; enabled: boolean }
  | { kind: 'control' }
  | { kind: 'run'; deviceId: number; commandKind: 'launch' | 'shutdown'; appKey?: string; requestId: string }
  | { kind: 'cancel'; commandId: string }
  | { kind: 'pairPreview'; code: string }
  | { kind: 'pair'; deviceId: number; code: string }
  | { kind: 'revoke'; deviceId: number }
  | { kind: 'saveAction'; deviceId: number; name: string; commandKind: 'launch' | 'shutdown'; appKey?: string }
  | { kind: 'deleteAction'; actionId: string }
  | { kind: 'logout' };
export type PcCommand = { id: string; kind: 'launch' | 'shutdown'; app_key: string | null; created: number; expires: number; status: string; result: string | null; cancel_requested: boolean; can_cancel: boolean };
export type PcAction = { id: string; name: string; kind: 'launch' | 'shutdown'; app_key: string | null };
export type Pc = { id: string; device_id: number; name: string; active: boolean; online: boolean; pc_online: boolean; state: 'ready' | 'connected' | 'offline' | 'unlinked'; last_seen: number | null; allow_shutdown: boolean; apps: { app_key: string; name: string }[]; actions: PcAction[]; commands: PcCommand[] };
export type ControlData = { version: 1; pcs: Pc[]; server_time: number };

export function isControlData(value: unknown): value is ControlData {
  if (!value || typeof value !== 'object') return false;
  const data = value as ControlData;
  return data.version === 1 && Number.isFinite(data.server_time) && Array.isArray(data.pcs) && data.pcs.every(pc =>
    pc && typeof pc.id === 'string' && Number.isSafeInteger(pc.device_id) && pc.device_id > 0 && typeof pc.name === 'string'
    && ['ready', 'connected', 'offline', 'unlinked'].includes(pc.state) && typeof pc.active === 'boolean'
    && typeof pc.online === 'boolean' && typeof pc.pc_online === 'boolean' && typeof pc.allow_shutdown === 'boolean'
    && (pc.last_seen === null || Number.isFinite(pc.last_seen))
    && Array.isArray(pc.apps) && pc.apps.every(a => a && typeof a.app_key === 'string' && typeof a.name === 'string')
    && Array.isArray(pc.actions) && pc.actions.every(a => a && typeof a.id === 'string' && typeof a.name === 'string' && ['launch', 'shutdown'].includes(a.kind) && (a.app_key === null || typeof a.app_key === 'string'))
    && Array.isArray(pc.commands) && pc.commands.every(c => c && typeof c.id === 'string' && ['launch', 'shutdown'].includes(c.kind)
      && (c.app_key === null || typeof c.app_key === 'string') && Number.isFinite(c.created) && Number.isFinite(c.expires)
      && typeof c.status === 'string' && (c.result === null || typeof c.result === 'string') && typeof c.can_cancel === 'boolean' && typeof c.cancel_requested === 'boolean'));
}
export type BridgeReply = { channel: 'wol-mobile-v1'; id: number; status: number; body: unknown };

// Requests run in the trusted panel, where HttpOnly session cookies remain.
// CSRF stays inside the WebView and is never persisted by the native client.
export function requestScript(origin: string, id: number, action: MobileAction): string {
  return `(() => {
    if (location.origin !== ${JSON.stringify(origin)} || window.top !== window) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const reply = (status, body) => window.ReactNativeWebView.postMessage(JSON.stringify({channel:'wol-mobile-v1',id:${id},status,body}));
    (async () => {
      try {
        const options = {credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}};
        const session = await fetch('/api/mobile/v1/devices', options);
        if (!(session.headers.get('content-type') || '').includes('application/json')) {
          reply(session.status === 404 ? 404 : 503, {message:'La API móvil todavía no está disponible.'}); return;
        }
        const data = await session.json();
        if (!session.ok) { reply(session.status, data); return; }
        const action = ${JSON.stringify(action)};
        if (action.kind === 'devices') {
          delete data.csrf_token;
          reply(session.status, data);
        } else {
          let path, method = 'POST', payload;
          const devicePath = '/api/mobile/v1/devices/' + action.deviceId;
          const controlPath = '/api/mobile/v1/control';
          if (action.kind === 'logout') path = '/api/mobile/v1/logout';
          else if (action.kind === 'remember') { path = '/api/mobile/v1/session/remember'; payload = {enabled:action.enabled}; }
          else if (action.kind === 'plan') { path = '/api/mobile/v1/plan'; method = 'GET'; }
          else if (action.kind === 'selectPlanDevice') { path = '/api/mobile/v1/plan/device'; payload = {device_id:action.deviceId}; }
          else if (action.kind === 'purchase') { path = '/api/mobile/v1/plan/purchase'; payload = {purchase_token:action.purchaseToken}; }
          else if (action.kind === 'adTicket') { path = '/api/mobile/v1/ads/ticket'; payload = {kind:action.format}; }
          else if (action.kind === 'control') { path = controlPath; method = 'GET'; }
          else if (action.kind === 'create' || action.kind === 'update') {
            path = action.kind === 'create' ? '/api/mobile/v1/devices' : devicePath;
            method = action.kind === 'update' ? 'PUT' : 'POST';
            payload = {name:action.name,mac:action.mac};
          } else if (action.kind === 'delete') { path = devicePath; method = 'DELETE'; }
          else if (action.kind === 'wake') path = devicePath + '/wake';
          else if (action.kind === 'run') {
            path = controlPath + '/devices/' + action.deviceId + '/run';
            payload = {kind:action.commandKind,app_key:action.appKey,request_id:action.requestId};
          } else if (action.kind === 'cancel') path = controlPath + '/commands/' + encodeURIComponent(action.commandId) + '/cancel';
          else if (action.kind === 'pairPreview') { path = controlPath + '/pair/preview'; payload = {code:action.code}; }
          else if (action.kind === 'pair') { path = controlPath + '/devices/' + action.deviceId + '/pair'; payload = {code:action.code}; }
          else if (action.kind === 'revoke') { path = controlPath + '/devices/' + action.deviceId + '/agent'; method = 'DELETE'; }
          else if (action.kind === 'saveAction') { path = controlPath + '/devices/' + action.deviceId + '/actions'; payload = {name:action.name,kind:action.commandKind,app_key:action.appKey}; }
          else if (action.kind === 'deleteAction') { path = controlPath + '/actions/' + encodeURIComponent(action.actionId); method = 'DELETE'; }
          else { reply(400, {message:'Operación desconocida.'}); return; }
          const result = await fetch(path, {
            ...options,method,
            headers:{...options.headers,...(method !== 'GET' ? {'X-CSRF-Token':data.csrf_token} : {}),...(payload ? {'Content-Type':'application/json'} : {})},
            ...(payload ? {body:JSON.stringify(payload)} : {})
          });
          const body = (result.headers.get('content-type') || '').includes('application/json')
            ? await result.json() : {message:'No se pudo completar la orden.'};
          delete body.csrf_token;
          reply(result.status, body);
        }
      } catch (_) { reply(0, {message:'No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.'}); }
      finally { clearTimeout(timer); }
    })();
  })(); true;`;
}

export function parseReply(url: string, data: string, origin: string): BridgeReply | null {
  try {
    if (new URL(url).origin !== origin || data.length > 1024 * 1024) return null;
    const value = JSON.parse(data);
    if (value.channel !== 'wol-mobile-v1' || !Number.isSafeInteger(value.id) || !Number.isInteger(value.status)) return null;
    return value;
  } catch { return null; }
}

export function isDeviceList(value: unknown): value is DeviceList {
  if (!value || typeof value !== 'object') return false;
  const data = value as DeviceList;
  return data.version === 1 && (data.email === null || typeof data.email === 'string')
    && (data.remembered === undefined || typeof data.remembered === 'boolean')
    && (data.plan === undefined || isAccountPlan(data.plan))
    && Array.isArray(data.devices)
    && data.devices.every(device => device && Number.isSafeInteger(device.id) && device.id > 0
      && typeof device.name === 'string' && typeof device.mac === 'string'
      && typeof device.wake_method === 'string' && typeof device.can_wake === 'boolean');
}
