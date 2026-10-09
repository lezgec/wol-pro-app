const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moduleStub = { exports: {} };
const source = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/mobileApi.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(source, { exports: moduleStub.exports, URL });
const { requestScript, parseReply, isDeviceList } = moduleStub.exports;
const origin = 'https://wol.example';
const list = { version: 1, email: 'test@example.invalid', csrf_token: 'csrf-only-in-webview', devices: [{ id: 1, name: 'PC', mac: 'AA:BB:CC:DD:EE:FF', wake_method: 'router', can_wake: true }] };
const response = (status, body, type = 'application/json') => ({ status, ok: status >= 200 && status < 300, headers: { get: () => type }, json: async () => body });
async function execute(action, responses) {
  const calls = [];
  let resolve;
  const result = new Promise(done => { resolve = done; });
  const window = { ReactNativeWebView: { postMessage: data => resolve(JSON.parse(data)) } };
  window.top = window;
  vm.runInNewContext(requestScript(origin, 5, action), {
    location: { origin }, window, AbortController, setTimeout, clearTimeout,
    fetch: async (url, options) => { calls.push({ url, options }); return responses.shift(); },
  });
  return { reply: await result, calls };
}
test('device list excludes CSRF from native messages', async () => {
  const { reply, calls } = await execute({ kind: 'devices' }, [response(200, structuredClone(list))]);
  assert.equal(reply.id, 5); assert.equal(reply.body.csrf_token, undefined);
  assert.equal(calls[0].options.credentials, 'same-origin');
  assert.ok(isDeviceList(reply.body));
});
test('wake sends CSRF and uses a fixed same-origin route', async () => {
  const { reply, calls } = await execute({ kind: 'wake', deviceId: 1 }, [response(200, list), response(200, { sent: true })]);
  assert.equal(reply.status, 200); assert.equal(calls[1].url, '/api/mobile/v1/devices/1/wake');
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(calls[1].options.headers['X-CSRF-Token'], list.csrf_token);
});
test('expired session never sends a wake request', async () => {
  const { reply, calls } = await execute({ kind: 'wake', deviceId: 1 }, [response(401, { error: 'authentication_required' })]);
  assert.equal(reply.status, 401); assert.equal(calls.length, 1);
});
test('older backend returns a controlled unavailable response', async () => {
  const { reply } = await execute({ kind: 'devices' }, [response(404, {}, 'text/html')]);
  assert.equal(reply.status, 404);
});
test('bridge does not execute requests in another origin', () => {
  const window = {}; window.top = window;
  vm.runInNewContext(requestScript(origin, 5, { kind: 'devices' }), {
    location: { origin: 'https://untrusted.example' }, window,
    fetch: () => assert.fail('External origin must not fetch'),
  });
});
test('native parser rejects external and malformed messages', () => {
  const data = JSON.stringify({ channel: 'wol-mobile-v1', id: 5, status: 200, body: {} });
  assert.equal(parseReply('https://untrusted.example/', data, origin), null);
  assert.equal(parseReply(origin, 'invalid', origin), null);
  assert.equal(parseReply(origin, '{"channel":"other"}', origin), null);
  assert.equal(parseReply(origin, data, origin).id, 5);
});
test('device validation rejects incomplete and invalid IDs', () => {
  assert.ok(isDeviceList(list));
  assert.equal(isDeviceList({ ...list, devices: [{ ...list.devices[0], id: -1 }] }), false);
  assert.equal(isDeviceList({ version: 1 }), false);
});
