import test from 'node:test';
import assert from 'node:assert';
import {
  hashPassword,
  comparePassword,
  signWebhookPayload,
  verifyWebhookSignature,
  generateApiKey,
  hashApiKey,
} from '../src/utils/crypto.js';

test('Password hashing and comparison', async () => {
  const plain = 'StrongPass123!';
  const hash = await hashPassword(plain);
  assert.strictEqual(typeof hash, 'string');
  assert.strictEqual(await comparePassword(plain, hash), true);
  assert.strictEqual(await comparePassword('WrongPassword', hash), false);
});

test('Webhook HMAC signature signing and timing-safe verification', () => {
  const payload = '{"event":"message.delivered","id":"msg_123"}';
  const secret = 'webhook_secret_key_vivegaa';

  const sig = signWebhookPayload(payload, secret);
  assert.strictEqual(typeof sig, 'string');
  assert.strictEqual(verifyWebhookSignature(payload, secret, sig), true);
  assert.strictEqual(verifyWebhookSignature(payload, 'wrong_secret', sig), false);
  assert.strictEqual(verifyWebhookSignature('tampered payload', secret, sig), false);
});

test('API key generation produces unique prefix and valid hash', () => {
  const { rawKey, keyPrefix, keyHash } = generateApiKey();
  assert.strictEqual(rawKey.startsWith('vw_live_'), true);
  assert.strictEqual(keyPrefix.length, 16);
  assert.strictEqual(hashApiKey(rawKey), keyHash);
});
