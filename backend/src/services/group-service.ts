import { whatsappConnection } from '../baileys/connection.js';
import { jidNormalizedUser } from '@whiskeysockets/baileys';
import { db } from '../db.js';
import { logger } from '../utils/logger.js';

function socket() {
  const current = whatsappConnection.getSocket();
  if (!current || whatsappConnection.getStatus().status !== 'CONNECTED') {
    throw new Error('Connect WhatsApp before loading or messaging groups.');
  }
  return current;
}

export const groupService = {
  async list() {
    const current = socket();
    const groups = await current.groupFetchAllParticipating();
    const selfIds = [current.user?.id, (current.user as any)?.lid].filter(Boolean).map(jidNormalizedUser);
    return Object.values(groups).map(group => {
      const self = group.participants.find(p => selfIds.includes(jidNormalizedUser(p.id)));
      return {
        id: group.id, name: group.subject, members: group.participants.length,
        canSend: !group.announce || self?.admin === 'admin' || self?.admin === 'superadmin',
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  },
  async send(id: string, text: string) {
    if (!/^\d+(?:-\d+)?@g\.us$/.test(id) || !text.trim() || text.length > 10000) {
      throw new Error('Choose a valid WhatsApp group and enter a message of 1–10000 characters.');
    }
    const groups = await this.list();
    const group = groups.find(item => item.id === id);
    if (!group) throw new Error('The connected account is not a member of this group.');
    if (!group.canSend) throw new Error('Only group administrators can post in this group.');
    const sent = await socket().sendMessage(id, { text: text.trim() });
    if (!sent?.key.id) throw new Error('WhatsApp did not confirm the send. Check the group before retrying.');
    // Once WhatsApp accepts a message, a history failure must not invite duplicate sends.
    let warning: string | undefined;
    try {
      const conversation = await db.conversation.upsert({
        where: { remoteJid: id },
        create: { remoteJid: id, lastMessageSnippet: text.trim().slice(0, 100) },
        update: { lastMessageAt: new Date(), lastMessageSnippet: text.trim().slice(0, 100) },
      });
      await db.message.create({ data: {
        conversationId: conversation.id, whatsappMessageId: sent.key.id,
        direction: 'OUTBOUND', senderJid: socket().user?.id || 'self', recipientJid: id,
        messageType: 'TEXT', textContent: text.trim(), status: 'SENT',
      } });
    } catch (err) {
      logger.error({ err, messageId: sent.key.id }, 'Group message sent but history could not be saved');
      warning = 'Message sent, but history could not be saved. Do not resend.';
    }
    return { success: true, messageId: sent.key.id, warning };
  },
};
