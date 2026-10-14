const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
function load(file, requireModule = () => { throw Error('unexpected import'); }) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: requireModule, Date, Error, Map, Set });
  return exports;
}
const restoration = load('restorePurchases.ts');
const { createPurchaseRecovery } = load('purchaseRecovery.ts', name => {
  assert.equal(name, './restorePurchases'); return restoration;
});
const purchase = { productId: 'wolpro_premium', purchaseState: 'purchased', purchaseToken: 'receipt' };
const active = () => ({ subscription: { provider: 'google_play', state: 'SUBSCRIPTION_STATE_ACTIVE', expires: Date.now() / 1000 + 1800 } });
function harness(overrides = {}) {
  let unlocked = true;
  const calls = [];
  const recovery = createPurchaseRecovery({
    products: ['wolpro_premium'], canProcess: () => unlocked,
    verify: async p => { calls.push(['verify', p.purchaseToken]); return active(); },
    finish: async p => { calls.push(['finish', p.purchaseToken]); },
    onBusy: value => calls.push(['busy', value]), onSuccess: () => calls.push(['success']),
    onPending: () => calls.push(['pending']), onError: e => calls.push(['error', e.message]),
    ...overrides,
  });
  return { recovery, calls, unlock: value => { unlocked = value; } };
}

test('purchase received behind biometric lock waits, then verifies and acknowledges automatically after unlock', async () => {
  const h = harness(); h.unlock(false); h.recovery.enqueue(purchase);
  await h.recovery.resume(); assert.deepEqual(h.calls, []);
  h.unlock(true); await h.recovery.resume();
  assert.deepEqual(h.calls.filter(c => c[0] !== 'busy').map(c => c[0]), ['verify', 'finish', 'success']);
});

test('lock interrupts bridge confirmation without losing the receipt or acknowledging it', async () => {
  let interrupted = true;
  const h = harness({ verify: async () => {
    h.calls.push(['verify']);
    if (interrupted) { h.unlock(false); throw Error('Desbloquea la app para continuar.'); }
    return active();
  } });
  h.recovery.enqueue(purchase); await h.recovery.resume();
  assert.equal(h.calls.some(c => c[0] === 'finish' || c[0] === 'error'), false);
  interrupted = false; h.unlock(true); await h.recovery.resume();
  assert.equal(h.calls.filter(c => c[0] === 'verify').length, 2);
  assert.equal(h.calls.filter(c => c[0] === 'finish').length, 1);
  assert.equal(h.calls.filter(c => c[0] === 'success').length, 1);
});

test('lock after verification still defers acknowledgement until the next unlock', async () => {
  let first = true;
  const h = harness({ verify: async () => { if (first) { first = false; h.unlock(false); } return active(); } });
  h.recovery.enqueue(purchase); await h.recovery.resume();
  assert.equal(h.calls.some(c => c[0] === 'finish'), false);
  h.unlock(true); await h.recovery.resume();
  assert.equal(h.calls.filter(c => c[0] === 'finish').length, 1);
});

test('purchase event and available-purchases replay are serialized and deduplicated', async () => {
  let release;
  const h = harness({ verify: () => new Promise(resolve => { release = () => resolve(active()); }) });
  h.recovery.enqueue(purchase); const first = h.recovery.resume();
  h.recovery.enqueue({ ...purchase }); const replay = h.recovery.resume();
  assert.equal(first, replay); release(); await Promise.all([first, replay]);
  h.recovery.enqueue(purchase); await h.recovery.resume();
  assert.equal(h.calls.filter(c => c[0] === 'finish').length, 1);
  assert.equal(h.calls.filter(c => c[0] === 'success').length, 1);
});

test('pending or unrelated purchases never grant or acknowledge Premium', async () => {
  const h = harness();
  h.recovery.enqueue({ ...purchase, productId: 'other' });
  h.recovery.enqueue({ ...purchase, purchaseState: 'pending' }); await h.recovery.resume();
  assert.equal(h.calls.filter(c => c[0] === 'pending').length, 1);
  assert.equal(h.calls.some(c => ['verify', 'finish', 'success'].includes(c[0])), false);
  h.recovery.enqueue(purchase); await h.recovery.resume();
  assert.equal(h.calls.filter(c => c[0] === 'finish').length, 1);
});

test('server rejection or missing entitlement surfaces an error without acknowledging', async () => {
  for (const verify of [async () => { throw Error('Compra de otra cuenta'); }, async () => undefined]) {
    const h = harness({ verify }); h.recovery.enqueue(purchase); await h.recovery.resume();
    assert.equal(h.calls.filter(c => c[0] === 'error').length, 1);
    assert.equal(h.calls.some(c => c[0] === 'finish' || c[0] === 'success'), false);
    const count = h.calls.length; await h.recovery.resume(); assert.equal(h.calls.length, count);
  }
});

test('leaving the account during verification cannot acknowledge or announce success', async () => {
  const h = harness({ verify: async () => { h.recovery.dispose(); return active(); } });
  h.recovery.enqueue(purchase); await h.recovery.resume();
  assert.equal(h.calls.some(c => c[0] === 'finish' || c[0] === 'success'), false);
  h.recovery.enqueue(purchase); const count = h.calls.length; await h.recovery.resume(); assert.equal(h.calls.length, count);
});
