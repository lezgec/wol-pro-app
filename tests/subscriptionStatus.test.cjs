const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const moduleStub = { exports: {} };
const source = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/subscriptionStatus.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(source, { exports: moduleStub.exports, Date, Number });
const { subscriptionStatus } = moduleStub.exports;
const now = 1700000000;
const subscription = (state, extra = {}) => ({ state, expires: now + 300, auto_renew: 1, ...extra });

test('pending subscriptions do not show the Unix epoch or renewal as activated', () => {
  const message = subscriptionStatus(subscription('SUBSCRIPTION_STATE_PENDING', { expires: 0 }), now);
  assert.match(message, /Pago pendiente/);
  assert.doesNotMatch(message, /1970|Renovación automática activada|Acceso de la suscripción hasta/);
});

test('a canceled renewal keeps the future access date without claiming renewal is active', () => {
  const message = subscriptionStatus(subscription('SUBSCRIPTION_STATE_CANCELED'), now);
  assert.match(message, /Sin renovación automática/);
  assert.match(message, /Acceso de la suscripción hasta/);
});

test('expired, held and paused subscriptions do not claim active renewal or current access', () => {
  for (const state of ['SUBSCRIPTION_STATE_EXPIRED', 'SUBSCRIPTION_STATE_ON_HOLD', 'SUBSCRIPTION_STATE_PAUSED', 'SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED']) {
    assert.doesNotMatch(subscriptionStatus(subscription(state), now), /Renovación automática activada|Acceso de la suscripción hasta/);
  }
});

test('a stale active receipt is described as awaiting a renewal check', () => {
  const message = subscriptionStatus(subscription('SUBSCRIPTION_STATE_ACTIVE', { expires: now }), now);
  assert.match(message, /terminó.*comprobar una renovación/);
  assert.doesNotMatch(message, /Renovación automática activada/);
});

test('grace periods communicate a payment issue and remaining access', () => {
  const message = subscriptionStatus(subscription('SUBSCRIPTION_STATE_IN_GRACE_PERIOD'), now);
  assert.match(message, /problema con la renovación/);
  assert.match(message, /Conservas el acceso hasta/);
});

test('absent and invalid receipts cannot display a fabricated access date', () => {
  assert.equal(subscriptionStatus(null, now), null);
  assert.equal(subscriptionStatus(undefined, now), null);
  for (const extra of [{ expires: 0 }, { expires: NaN }, { expires: Infinity }, { state: 'UNKNOWN' }]) {
    assert.match(subscriptionStatus(subscription('SUBSCRIPTION_STATE_ACTIVE', extra), now), /sin confirmar/);
  }
});
