const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moduleStub = { exports: {} };
const source = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/restorePurchases.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(source, { exports: moduleStub.exports, Date, Error });
const { restorePlayPurchases } = moduleStub.exports;
const purchased = { productId: 'wolpro_premium', purchaseState: 'purchased', purchaseToken: 'test-token' };
const plan = (state = 'SUBSCRIPTION_STATE_ACTIVE', expires = Date.now() / 1000 + 3600) => ({
  subscription: { provider: 'google_play', state, expires },
});
const run = options => restorePlayPurchases({ products: ['wolpro_premium'], purchases: [purchased], ...options });

test('restoration verifies with the server before finishing and reports success even for an already active plan', async () => {
  const calls = [];
  const message = await run({ verify: async p => { calls.push(['verify', p]); return plan(); }, finish: async p => calls.push(['finish', p]) });
  assert.deepEqual(calls.map(call => call[0]), ['verify', 'finish']);
  assert.match(message, /Compra restaurada/);
  assert.match(message, /Si ya estaba activo/);
});

test('unrelated products return an explicit no-purchases result without verification or finishing', async () => {
  const unexpected = () => assert.fail('must not process an unrelated product');
  const message = await run({ purchases: [{ ...purchased, productId: 'other' }], verify: unexpected, finish: unexpected });
  assert.match(message, /no encontró suscripciones/);
});

test('pending payments report pending without verification or acknowledgement', async () => {
  const unexpected = () => assert.fail('must not process a pending purchase');
  const message = await run({ purchases: [{ ...purchased, purchaseState: 'pending' }], verify: unexpected, finish: unexpected });
  assert.match(message, /pago pendiente/);
  assert.doesNotMatch(message, /Premium está activo/);
});

test('expired or revoked subscriptions cannot produce a restoration success or acknowledgement', async () => {
  for (const subscription of [plan('SUBSCRIPTION_STATE_EXPIRED'), plan('SUBSCRIPTION_STATE_ACTIVE', 1), plan('SUBSCRIPTION_STATE_ON_HOLD')]) {
    const message = await run({ verify: async () => subscription, finish: () => assert.fail('must not finish without entitlement') });
    assert.match(message, /sin acceso vigente/);
    assert.doesNotMatch(message, /Compra restaurada/);
  }
});

test('canceled renewal preserves restoration before its verified expiry', async () => {
  let finished = false;
  const message = await run({ verify: async () => plan('SUBSCRIPTION_STATE_CANCELED'), finish: async () => { finished = true; } });
  assert.equal(finished, true);
  assert.match(message, /Premium está activo/);
});

test('missing receipts and missing server confirmation are explicit failures', async () => {
  const unexpected = () => assert.fail('must not acknowledge an unverified purchase');
  await assert.rejects(run({ purchases: [{ ...purchased, purchaseToken: null }], verify: unexpected, finish: unexpected }), /no entregó el comprobante/);
  await assert.rejects(run({ verify: async () => undefined, finish: unexpected }), /no confirmó el estado/);
});

test('ownership, network and acknowledgement failures propagate rather than reporting success', async () => {
  const denied = new Error('Esta compra está vinculada con otra cuenta.');
  await assert.rejects(run({ verify: async () => { throw denied; }, finish: () => assert.fail('must not acknowledge a rejected receipt') }), error => error === denied);
  await assert.rejects(run({ verify: async () => plan(), finish: async () => { throw new Error('Google Play no está disponible'); } }), /no está disponible/);
});
