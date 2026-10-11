import test from 'node:test';
import assert from 'node:assert';
import { normalizePhoneNumber, jidToPhoneNumber } from '../src/utils/phone.js';

test('Phone normalization handles 10-digit Indian mobile', () => {
  const result = normalizePhoneNumber('9876543210');
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.e164, '+919876543210');
  assert.strictEqual(result.jid, '919876543210@s.whatsapp.net');
});

test('Phone normalization handles Indian mobile with +91 prefix', () => {
  const result = normalizePhoneNumber('+91 98765 43210');
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.e164, '+919876543210');
  assert.strictEqual(result.jid, '919876543210@s.whatsapp.net');
});

test('Phone normalization handles Indian mobile with trunk 0', () => {
  const result = normalizePhoneNumber('09876543210');
  assert.strictEqual(result.isValid, true);
  assert.strictEqual(result.e164, '+919876543210');
});

test('Phone normalization rejects invalid phone numbers', () => {
  const result = normalizePhoneNumber('12345');
  assert.strictEqual(result.isValid, false);
});

test('jidToPhoneNumber converts JID correctly', () => {
  assert.strictEqual(jidToPhoneNumber('919876543210@s.whatsapp.net'), '+919876543210');
  assert.strictEqual(jidToPhoneNumber('919876543210:12@s.whatsapp.net'), '+919876543210');
});
