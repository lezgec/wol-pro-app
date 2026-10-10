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
test('create sends only device fields and strips returned CSRF', async () => {
  const name = "PC'); throw new Error('injection'); //";
  const { reply, calls } = await execute({ kind: 'create', name, mac: 'AA:BB:CC:DD:EE:11' },
    [response(200, structuredClone(list)), response(201, structuredClone(list))]);
  assert.equal(calls[1].url, '/api/mobile/v1/devices');
  assert.equal(calls[1].options.method, 'POST');
  assert.equal(JSON.parse(calls[1].options.body).name, name);
  assert.equal(reply.body.csrf_token, undefined);
  assert.equal(reply.status, 201);
});
test('edit uses PUT and returns a validation failure without retry', async () => {
  const { reply, calls } = await execute({ kind: 'update', deviceId: 1, name: 'PC', mac: 'bad' },
    [response(200, list), response(400, { message: 'MAC inválida' })]);
  assert.equal(calls[1].url, '/api/mobile/v1/devices/1');
  assert.equal(calls[1].options.method, 'PUT');
  assert.equal(reply.status, 400); assert.equal(calls.length, 2);
});
test('logout uses a CSRF-protected POST', async () => {
  const { reply, calls } = await execute({ kind: 'logout' }, [response(200, list), response(200, { message: 'Sesión cerrada' })]);
  assert.equal(calls[1].url, '/api/mobile/v1/logout');
  assert.equal(calls[1].options.method, 'POST'); assert.equal(reply.status, 200);
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
const { isControlData } = moduleStub.exports;
test('control fetch keeps session and credentials inside trusted WebView', async () => {
  const control = {version:1,pcs:[],server_time:123};
  const {reply,calls} = await execute({kind:'control'}, [response(200, structuredClone(list)), response(200,control)]);
  assert.equal(calls[1].url,'/api/mobile/v1/control');
  assert.equal(calls[1].options.method,'GET');
  assert.equal(reply.status,200);
  assert.ok(isControlData(reply.body));
});
test('PC command preserves idempotency ID and never sends script text', async () => {
  const action = {kind:'run',deviceId:1,commandKind:'launch',appKey:'catalog-id',requestId:'request-id'};
  const {reply,calls} = await execute(action, [response(200, structuredClone(list)),response(202,{command_id:'queue-id'})]);
  assert.equal(calls[1].url,'/api/mobile/v1/control/devices/1/run');
  assert.equal(calls[1].options.headers['X-CSRF-Token'],list.csrf_token);
  assert.deepEqual(JSON.parse(calls[1].options.body),{kind:'launch',app_key:'catalog-id',request_id:'request-id'});
  assert.equal(reply.status,202);
  assert.equal(calls.length,2);
});
test('command cancellation encodes an ID without navigating or retrying', async () => {
  const {calls} = await execute({kind:'cancel',commandId:'../bad/id'},[response(200,structuredClone(list)),response(409,{})]);
  assert.equal(calls[1].url,'/api/mobile/v1/control/commands/..%2Fbad%2Fid/cancel');
  assert.equal(calls.length,2);
});
test('pair preview validates identity before separate authorization',async () => {
  const {calls}=await execute({kind:'pairPreview',code:'ABCD-2345'},[response(200,structuredClone(list)),response(200,{computer_name:'Test PC'})]);
  assert.equal(calls[1].url,'/api/mobile/v1/control/pair/preview');
  assert.deepEqual(JSON.parse(calls[1].options.body),{code:'ABCD-2345'});
});
test('device deletion uses CSRF protected DELETE',async () => {
  const {calls}=await execute({kind:'delete',deviceId:1},[response(200,structuredClone(list)),response(200,structuredClone(list))]);
  assert.equal(calls[1].options.method,'DELETE');
  assert.equal(calls[1].options.headers['X-CSRF-Token'],list.csrf_token);
});
test('control data rejects malformed catalogs and command permissions', () => {
  const pc={id:'id',device_id:1,name:'PC',state:'ready',active:true,online:true,pc_online:true,last_seen:123,allow_shutdown:true,apps:[],actions:[],commands:[]};
  assert.ok(isControlData({version:1,server_time:123,pcs:[pc]}));
  assert.equal(isControlData({version:1,server_time:123,pcs:[{...pc,apps:[{name:'Missing ID'}]}]}),false);
  assert.equal(isControlData({version:1,server_time:123,pcs:[{...pc,commands:[{id:'bad',can_cancel:'yes'}]}]}),false);
});
test('remember session is explicit and CSRF protected without sending a password',async () => {
  const {reply,calls}=await execute({kind:'remember',enabled:true},[response(200,structuredClone(list)),response(200,{...structuredClone(list),remembered:true})]);
  assert.equal(calls[1].url,'/api/mobile/v1/session/remember');
  assert.equal(calls[1].options.headers['X-CSRF-Token'],list.csrf_token);
  assert.deepEqual(JSON.parse(calls[1].options.body),{enabled:true});
  assert.equal(reply.body.remembered,true);
  assert.equal(reply.body.csrf_token,undefined);
});


test('plan purchase sends a receipt to the trusted backend and never a premium flag', async () => {
  const {calls,reply} = await execute({kind:'purchase',purchaseToken:'test-receipt'}, [response(200,list), response(200,{version:1,plan:{tier:'premium'}})]);
  assert.equal(calls[1].url,'/api/mobile/v1/plan/purchase');
  assert.deepEqual(JSON.parse(calls[1].options.body),{purchase_token:'test-receipt'});
  assert.equal(calls[1].options.headers['X-CSRF-Token'],'csrf-only-in-webview');
  assert.equal(reply.status,200);
});

test('reward request obtains a ticket and cannot submit client completion as a reward', async () => {
  const {calls} = await execute({kind:'adTicket',format:'rewarded'}, [response(200,list),response(200,{ticket:'temporary-ticket'})]);
  assert.equal(calls[1].url,'/api/mobile/v1/ads/ticket');
  assert.deepEqual(JSON.parse(calls[1].options.body),{kind:'rewarded'});
  assert.equal(calls[1].options.credentials,'same-origin');
});
