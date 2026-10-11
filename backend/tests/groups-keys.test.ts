import test from 'node:test';
import assert from 'node:assert/strict';
import { groupService } from '../src/services/group-service.js';
import { whatsappConnection } from '../src/baileys/connection.js';
import { db } from '../src/db.js';
import { adminApiRouter } from '../src/routes/admin-api.js';
import { hashApiKey } from '../src/utils/crypto.js';

test('group sends target one group JID, enforce membership/admin rules, and save history', async () => {
  const originals = [whatsappConnection.getSocket, whatsappConnection.getStatus, db.conversation.upsert, db.message.create];
  let sentTo = ''; let restricted = false; let saved: any;
  whatsappConnection.getStatus = (() => ({ status: 'CONNECTED' })) as any;
  whatsappConnection.getSocket = (() => ({
    user: { id: '919999999999:1@s.whatsapp.net' },
    groupFetchAllParticipating: async () => ({ group: { id: '123456@g.us', subject: 'School', announce: restricted, participants: [{ id: '919999999999@s.whatsapp.net', admin: null }] } }),
    sendMessage: async (jid: string) => { sentTo = jid; return { key: { id: 'sent-1' } }; },
  })) as any;
  db.conversation.upsert = (async () => ({ id: 'conversation' })) as any;
  db.message.create = (async (args: any) => { saved = args.data; return args.data; }) as any;
  try {
    assert.equal((await groupService.list())[0].name, 'School');
    await groupService.send('123456@g.us', 'Hello');
    assert.equal(sentTo, '123456@g.us'); assert.equal(saved.recipientJid, sentTo);
    await assert.rejects(groupService.send('654321@g.us', 'Hello'), /not a member/);
    await assert.rejects(groupService.send('919999999999', 'Hello'), /valid WhatsApp group/);
    restricted = true;
    await assert.rejects(groupService.send('123456@g.us', 'Hello'), /administrators/);
    restricted = false;
    db.message.create = (async () => { throw new Error('database unavailable'); }) as any;
    assert.match((await groupService.send('123456@g.us', 'Hello')).warning!, /Do not resend/);
  } finally {
    [whatsappConnection.getSocket, whatsappConnection.getStatus, db.conversation.upsert, db.message.create] = originals as any;
  }
});

function route(path: string, method: string) {
  return (adminApiRouter as any).stack.find((entry: any) => entry.route?.path === path && entry.route.methods[method]).route.stack;
}
function response() { return { code: 200, body: null as any, status(n: number) { this.code = n; return this; }, json(body: any) { this.body = body; return this; } }; }
test('key rotation replaces stored hash and deletion is limited to super admins', async () => {
  const update = db.apiKey.updateMany; const remove = db.apiKey.deleteMany;
  let stored: any; let deleted: any;
  db.apiKey.updateMany = (async (args: any) => { stored = args; return { count: 1 }; }) as any;
  db.apiKey.deleteMany = (async (args: any) => { deleted = args; return { count: 1 }; }) as any;
  try {
    const rotation = route('/api-keys/:id/rotate', 'post');
    const denied = response(); let next = false;
    rotation[0].handle({ user: { role: 'ADMIN' } }, denied, () => { next = true; });
    assert.equal(denied.code, 403); assert.equal(next, false);
    const res = response();
    await rotation[1].handle({ params: { id: 'key-1' } }, res);
    assert.equal(stored.where.id, 'key-1'); assert.equal(hashApiKey(res.body.apiKey), stored.data.keyHash);
    const deletion = route('/api-keys/:id', 'delete');
    const deniedDelete = response();
    deletion[0].handle({ user: { role: 'MESSAGING_STAFF' } }, deniedDelete, () => assert.fail());
    assert.equal(deniedDelete.code, 403);
    await deletion[1].handle({ params: { id: 'key-1' } }, response());
    assert.equal(deleted.where.id, 'key-1');
  } finally { db.apiKey.updateMany = update; db.apiKey.deleteMany = remove; }
});
