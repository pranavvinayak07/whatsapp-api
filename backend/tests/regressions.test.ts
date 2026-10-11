import test from 'node:test';
import assert from 'node:assert/strict';
import { requireApiKey } from '../src/middleware/api-key-middleware.js';
import { AuthService } from '../src/services/auth-service.js';
import { db } from '../src/db.js';
import { QueueWorker } from '../src/queue/queue-worker.js';
import { queueService } from '../src/queue/queue-service.js';
import { setupBaileysEventHandlers } from '../src/baileys/event-handler.js';

function response() {
  return { code: 200, status(code: number) { this.code = code; return this; }, json(body: any) { return body; } };
}
test('dashboard send requires a session with messaging permission', async () => {
  for (const [role, expected] of [['MESSAGING_STAFF', 200], ['VIEWER', 403]]) {
    const token = AuthService.generateToken({ userId: 'test', name: 'Test', email: 'test@example.com', role });
    const res = response(); let passed = false;
    await requireApiKey({ path: '/messages/text', method: 'POST', headers: {}, cookies: { token } } as any, res as any, () => { passed = true; });
    assert.equal(res.code, expected); assert.equal(passed, expected === 200);
  }
});
test('media downloads reject anonymous requests', async () => {
  const res = response(); let passed = false;
  await requireApiKey({ path: '/api/v1/media/download/file.pdf', method: 'GET', headers: {}, cookies: {} } as any, res as any, () => { passed = true; });
  assert.equal(res.code, 401); assert.equal(passed, false);
});
test('read-only API key cannot send messages', async () => {
  const original = db.apiKey.findFirst;
  db.apiKey.findFirst = (async () => ({ id: 'key', scopes: ['contacts:read'], expiresAt: null })) as any;
  try {
    const res = response(); let passed = false;
    await requireApiKey({ path: '/messages/text', method: 'POST', headers: { 'x-api-key': 'test-key' } } as any, res as any, () => { passed = true; });
    assert.equal(res.code, 403); assert.equal(passed, false);
  } finally { db.apiKey.findFirst = original; }
});
test('every new socket gets message handlers exactly once', () => {
  let count = 0;
  const first = { ev: { on() { count++; } } } as any;
  const second = { ev: { on() { count++; } } } as any;
  setupBaileysEventHandlers(first); setupBaileysEventHandlers(first); setupBaileysEventHandlers(second);
  assert.equal(count, 4);
});
test('paused queue schedules once and recovers stale jobs for review', async () => {
  const worker = new QueueWorker() as any;
  const original = db.queuedMessage.updateMany;
  let recovery: any; let scheduled = 0;
  db.queuedMessage.updateMany = (async (args: any) => { recovery = args; return { count: 1 }; }) as any;
  worker.scheduleNextTick = () => { scheduled++; };
  queueService.setPaused(true);
  try {
    await worker.processNextBatch();
    assert.equal(scheduled, 1);
    assert.equal(recovery.where.status, 'PROCESSING');
    assert.equal(recovery.data.status, 'FAILED');
    assert.match(recovery.data.lastError, /outcome unknown/);
  } finally { db.queuedMessage.updateMany = original; queueService.setPaused(false); }
});
