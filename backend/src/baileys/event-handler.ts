import fs from 'fs';
import path from 'path';
import { downloadMediaMessage, WAMessage, WASocket } from '@whiskeysockets/baileys';
import { whatsappConnection } from './connection.js';
import { db } from '../db.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { jidToPhoneNumber } from '../utils/phone.js';

const initializedSockets = new WeakSet<WASocket>();

export function setupBaileysEventHandlers(socket: WASocket) {
  if (initializedSockets.has(socket)) return;
  initializedSockets.add(socket);

  // Inbound messages listener
  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        await processIncomingMessage(msg);
      } catch (err) {
        logger.error({ err, msgId: msg.key?.id }, 'Failed to process incoming message');
      }
    }
  });

  // Message status updates (sent, delivered, read)
  socket.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      try {
        const id = update.key.id;
        if (!id) continue;

        let status: any = 'UNKNOWN';
        if (update.update?.status === 3) status = 'DELIVERED';
        if (update.update?.status === 4) status = 'READ';

        if (status !== 'UNKNOWN') {
          const existing = await db.message.findUnique({
            where: { whatsappMessageId: id },
          });

          if (existing) {
            await db.message.update({
              where: { id: existing.id },
              data: { status },
            });

            await db.messageStatusEvent.create({
              data: {
                messageId: existing.id,
                status,
                details: `Status update received from WhatsApp network: ${status}`,
              },
            });
          }
        }
      } catch (err) {
        logger.error({ err }, 'Failed to process message status update');
      }
    }
  });
}

async function processIncomingMessage(msg: WAMessage) {
  if (!msg.message || !msg.key?.remoteJid) return;

  const remoteJid = msg.key.remoteJid;
  // Ignore status broadcast updates
  if (remoteJid === 'status@broadcast') return;

  const isFromMe = Boolean(msg.key.fromMe);
  const whatsappMessageId = msg.key.id || undefined;
  const phoneNumber = jidToPhoneNumber(remoteJid);

  // Extract text content and determine type
  let messageType: any = 'TEXT';
  let textContent: string | null = null;
  let mediaBuffer: Buffer | null = null;
  let fileName: string | null = null;
  let mimeType: string | null = null;

  const m = msg.message;

  if (m.conversation) {
    textContent = m.conversation;
  } else if (m.extendedTextMessage?.text) {
    textContent = m.extendedTextMessage.text;
  } else if (m.imageMessage) {
    messageType = 'IMAGE';
    textContent = m.imageMessage.caption || null;
    mimeType = m.imageMessage.mimetype || 'image/jpeg';
  } else if (m.documentMessage) {
    messageType = 'DOCUMENT';
    textContent = m.documentMessage.caption || null;
    fileName = m.documentMessage.fileName || 'file.pdf';
    mimeType = m.documentMessage.mimetype || 'application/pdf';
  } else if (m.videoMessage) {
    messageType = 'VIDEO';
    textContent = m.videoMessage.caption || null;
    mimeType = m.videoMessage.mimetype || 'video/mp4';
  } else if (m.audioMessage) {
    messageType = m.audioMessage.ptt ? 'VOICE_NOTE' : 'AUDIO';
    mimeType = m.audioMessage.mimetype || 'audio/ogg';
  } else if (m.locationMessage) {
    messageType = 'LOCATION';
    textContent = `Location: ${m.locationMessage.degreesLatitude}, ${m.locationMessage.degreesLongitude} (${m.locationMessage.name || ''})`;
  } else if (m.contactMessage) {
    messageType = 'CONTACT';
    textContent = `Contact: ${m.contactMessage.displayName || ''}`;
  } else if (m.reactionMessage) {
    messageType = 'REACTION';
    textContent = m.reactionMessage.text || '';
  }

  // Find or create Contact
  let contact = await db.contact.findFirst({
    where: { e164Phone: phoneNumber },
  });

  if (!contact && phoneNumber) {
    contact = await db.contact.create({
      data: {
        fullName: msg.pushName || phoneNumber,
        phoneNumber,
        e164Phone: phoneNumber,
        contactType: 'PARENT',
        consentStatus: 'OPTED_IN',
      },
    });
  }

  // Find or create Conversation
  let conversation = await db.conversation.findUnique({
    where: { remoteJid },
  });

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        remoteJid,
        contactId: contact?.id,
        lastMessageSnippet: textContent?.substring(0, 100) || `[${messageType}]`,
        unreadCount: isFromMe ? 0 : 1,
      },
    });
  } else {
    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessageSnippet: textContent?.substring(0, 100) || `[${messageType}]`,
        unreadCount: isFromMe ? conversation.unreadCount : conversation.unreadCount + 1,
        contactId: contact?.id || conversation.contactId,
      },
    });
  }

  // Check deduplication
  if (whatsappMessageId) {
    const existing = await db.message.findUnique({
      where: { whatsappMessageId },
    });
    if (existing) return;
  }

  // Resolve correct sender and recipient JIDs
  const connectedPhone = whatsappConnection.getStatus().phoneNumber;
  const socketUserJid = whatsappConnection.getSocket()?.user?.id;
  const selfJid = connectedPhone
    ? `${connectedPhone.replace(/^\+/, '')}@s.whatsapp.net`
    : (socketUserJid ? `${socketUserJid.split(':')[0].split('@')[0]}@s.whatsapp.net` : 'self');

  const senderJid = isFromMe ? selfJid : (msg.key.participant || remoteJid);
  const recipientJid = isFromMe ? remoteJid : selfJid;

  // Create message record
  const createdMsg = await db.message.create({
    data: {
      conversationId: conversation.id,
      whatsappMessageId,
      direction: isFromMe ? 'OUTBOUND' : 'INBOUND',
      senderJid,
      recipientJid,
      messageType,
      textContent,
      status: isFromMe ? 'SENT' : 'DELIVERED',
      quotedMessageId: m.extendedTextMessage?.contextInfo?.stanzaId || undefined,
      rawPayload: m as any,
    },
  });

  // Download media if attachment exists
  if (['IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO', 'VOICE_NOTE'].includes(messageType)) {
    try {
      const buffer = await downloadMediaMessage(
        msg,
        'buffer',
        {},
        {
          logger: logger.child({ module: 'media-download' }) as any,
          reuploadRequest: whatsappConnection.getSocket()!.updateMediaMessage,
        }
      );

      if (buffer) {
        const ext = mimeType?.split('/')[1]?.split(';')[0] || 'bin';
        const diskFileName = `${createdMsg.id}_${Date.now()}.${ext}`;
        const filePath = path.join(config.MEDIA_STORAGE_DIR, diskFileName);

        if (!fs.existsSync(config.MEDIA_STORAGE_DIR)) {
          fs.mkdirSync(config.MEDIA_STORAGE_DIR, { recursive: true });
        }

        fs.writeFileSync(filePath, buffer);

        await db.messageAttachment.create({
          data: {
            messageId: createdMsg.id,
            fileName: fileName || diskFileName,
            fileType: messageType,
            mimeType: mimeType || 'application/octet-stream',
            fileSize: buffer.length,
            storagePath: filePath,
            publicUrl: `/api/v1/media/download/${diskFileName}`,
          },
        });
      }
    } catch (mediaErr) {
      logger.warn({ mediaErr, msgId: createdMsg.id }, 'Could not download media payload');
    }
  }

  logger.info({ id: createdMsg.id, type: messageType, from: remoteJid }, 'Stored incoming message');
}
