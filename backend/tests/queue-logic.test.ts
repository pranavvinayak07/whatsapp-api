import test from 'node:test';
import assert from 'node:assert';

test('Exponential backoff delay calculation', () => {
  const computeBackoff = (retryCount: number) => Math.min(300000, 5000 * Math.pow(2, retryCount));

  assert.strictEqual(computeBackoff(1), 10000); // 10s
  assert.strictEqual(computeBackoff(2), 20000); // 20s
  assert.strictEqual(computeBackoff(3), 40000); // 40s
  assert.strictEqual(computeBackoff(10), 300000); // capped at 5 mins
});

test('Interactive message fallback numbering structure', () => {
  const buttons = [
    { id: '1', label: 'View Fee' },
    { id: '2', label: 'Contact Office' },
    { id: '3', label: 'Acknowledge' },
  ];

  let formatted = `*Fee Reminder*\n\nYour fee is pending.\n\n_Reply with the number of your choice:_\n`;
  buttons.forEach((b, i) => {
    formatted += `*${i + 1}* - ${b.label}\n`;
  });

  assert.strictEqual(formatted.includes('*1* - View Fee'), true);
  assert.strictEqual(formatted.includes('*2* - Contact Office'), true);
  assert.strictEqual(formatted.includes('*3* - Acknowledge'), true);
});
