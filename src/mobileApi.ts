export type Device = { id: number; name: string; mac: string; wake_method: string; can_wake: boolean };
export type DeviceList = { version: 1; email: string | null; devices: Device[]; alexa_ready?: boolean };
export type MobileAction = { kind: 'devices' } | { kind: 'wake'; deviceId: number }
  | { kind: 'create'; name: string; mac: string }
  | { kind: 'update'; deviceId: number; name: string; mac: string }
  | { kind: 'logout' };
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
          const path = action.kind === 'logout' ? '/api/mobile/v1/logout'
            : action.kind === 'create' ? '/api/mobile/v1/devices'
            : '/api/mobile/v1/devices/' + action.deviceId + (action.kind === 'wake' ? '/wake' : '');
          const write = action.kind === 'create' || action.kind === 'update';
          const result = await fetch(path, {
            ...options,method:action.kind === 'update' ? 'PUT' : 'POST',
            headers:{...options.headers,'X-CSRF-Token':data.csrf_token,...(write ? {'Content-Type':'application/json'} : {})},
            ...(write ? {body:JSON.stringify({name:action.name,mac:action.mac})} : {})
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
  return data.version === 1 && (data.email === null || typeof data.email === 'string') && Array.isArray(data.devices)
    && data.devices.every(device => device && Number.isSafeInteger(device.id) && device.id > 0
      && typeof device.name === 'string' && typeof device.mac === 'string'
      && typeof device.wake_method === 'string' && typeof device.can_wake === 'boolean');
}
