import { WASocket, proto } from '@whiskeysockets/baileys';
import { whatsappConnection } from './connection.js';
import {
  OutboundTextMessage,
  OutboundMediaMessage,
  OutboundLocationMessage,
  OutboundContactMessage,
  OutboundInteractiveMessage,
  OutboundReactionMessage,
  SendResult,
} from './types.js';
import { normalizePhoneNumber } from '../utils/phone.js';
import { logger } from '../utils/logger.js';

class WhatsAppMessageSender {
  private getActiveSocket(): WASocket {
    const socket = whatsappConnection.getSocket();
    const status = whatsappConnection.getStatus().status;
    if (!socket || status !== 'CONNECTED') {
      throw new Error('WhatsApp is not connected. Please scan QR code in Connections dashboard.');
    }
    return socket;
  }

  public async sendText(msg: OutboundTextMessage): Promise<SendResult> {
    const socket = this.getActiveSocket();
    const normalized = normalizePhoneNumber(msg.recipient);
    if (!normalized.isValid) {
      return { success: false, status: 'FAILED', error: `Invalid recipient phone number: ${msg.recipient}` };
    }

    try {
      const sent = await socket.sendMessage(
        normalized.jid,
        { text: msg.text },
        msg.quotedMessageId ? { quoted: { key: { id: msg.quotedMessageId, remoteJid: normalized.jid } } as any } : undefined
      );

      return {
        success: true,
        status: 'SENT',
        messageId: sent?.key?.id || undefined,
        timestamp: sent?.messageTimestamp ? Number(sent.messageTimestamp) : Date.now(),
      };
    } catch (err: any) {
      logger.error({ err, recipient: msg.recipient }, 'Failed to send WhatsApp text message');
      return { success: false, status: 'FAILED', error: err?.message || 'Failed to send message' };
    }
  }

  public async sendImage(msg: OutboundMediaMessage): Promise<SendResult> {
    const socket = this.getActiveSocket();
    const normalized = normalizePhoneNumber(msg.recipient);
    if (!normalized.isValid) {
      return { success: false, status: 'FAILED', error: `Invalid recipient phone number: ${msg.recipient}` };
    }

    try {
      const payload: any = {
        image: msg.mediaBuffer || { url: msg.mediaUrl! },
        caption: msg.caption,
        mimetype: msg.mimeType || 'image/jpeg',
      };

      const sent = await socket.sendMessage(normalized.jid, payload);
      return {
        success: true,
        status: 'SENT',
        messageId: sent?.key?.id || undefined,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      logger.error({ err, recipient: msg.recipient }, 'Failed to send WhatsApp image message');
      return { success: false, status: 'FAILED', error: err?.message || 'Failed to send image' };
    }
  }

  public async sendDocument(msg: OutboundMediaMessage): Promise<SendResult> {
    const socket = this.getActiveSocket();
    const normalized = normalizePhoneNumber(msg.recipient);
    if (!normalized.isValid) {
      return { success: false, status: 'FAILED', error: `Invalid recipient phone number: ${msg.recipient}` };
    }

    try {
      const payload: any = {
        document: msg.mediaBuffer || { url: msg.mediaUrl! },
        caption: msg.caption,
        fileName: msg.fileName || 'document.pdf',
        mimetype: msg.mimeType || 'application/pdf',
      };

      const sent = await socket.sendMessage(normalized.jid, payload);
      return {
        success: true,
        status: 'SENT',
        messageId: sent?.key?.id || undefined,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      logger.error({ err, recipient: msg.recipient }, 'Failed to send WhatsApp document message');
      return { success: false, status: 'FAILED', error: err?.message || 'Failed to send document' };
    }
  }

  public async sendVideo(msg: OutboundMediaMessage): Promise<SendResult> {
    const socket = this.getActiveSocket();
    const normalized = normalizePhoneNumber(msg.recipient);
    if (!normalized.isValid) {
      return { success: false, status: 'FAILED', error: `Invalid recipient phone number: ${msg.recipient}` };
    }

    try {
      const payload: any = {
        video: msg.mediaBuffer || { url: msg.mediaUrl! },
        caption: msg.caption,
        mimetype: msg.mimeType || 'video/mp4',
      };

      const sent = await socket.sendMessage(normalized.jid, payload);
      return {
        success: true,
        status: 'SENT',
        messageId: sent?.key?.id || undefined,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      logger.error({ err, recipient: msg.recipient }, 'Failed to send WhatsApp video message');
      return { success: false, status: 'FAILED', error: err?.message || 'Failed to send video' };
    }
  }

  public async sendAudio(msg: OutboundMediaMessage, isVoiceNote = false): Promise<SendResult> {
    const socket = this.getActiveSocket();
    const normalized = normalizePhoneNumber(msg.recipient);
    if (!normalized.isValid) {
      return { success: false, status: 'FAILED', error: `Invalid recipient phone number: ${msg.recipient}` };
    }

    try {
      const payload: any = {
        audio: msg.mediaBuffer || { url: msg.mediaUrl! },
        ptt: isVoiceNote,
        mimetype: msg.mimeType || (isVoiceNote ? 'audio/ogg; codecs=opus' : 'audio/mp4'),
      };

      const sent = await socket.sendMessage(normalized.jid, payload);
      return {
        success: true,
        status: 'SENT',
        messageId: sent?.key?.id || undefined,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      logger.error({ err, recipient: msg.recipient }, 'Failed to send WhatsApp audio message');
      return { success: false, status: 'FAILED', error: err?.message || 'Failed to send audio' };
    }
  }

  public async sendLocation(msg: OutboundLocationMessage): Promise<SendResult> {
    const socket = this.getActiveSocket();
    const normalized = normalizePhoneNumber(msg.recipient);
    if (!normalized.isValid) {
      return { success: false, status: 'FAILED', error: `Invalid recipient phone number: ${msg.recipient}` };
    }

    try {
      const sent = await socket.sendMessage(normalized.jid, {
        location: {
          degreesLatitude: msg.latitude,
          degreesLongitude: msg.longitude,
          name: msg.name,
          address: msg.address,
        },
      });

      return {
        success: true,
        status: 'SENT',
        messageId: sent?.key?.id || undefined,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      logger.error({ err, recipient: msg.recipient }, 'Failed to send WhatsApp location message');
      return { success: false, status: 'FAILED', error: err?.message || 'Failed to send location' };
    }
  }

  public async sendContact(msg: OutboundContactMessage): Promise<SendResult> {
    const socket = this.getActiveSocket();
    const normalized = normalizePhoneNumber(msg.recipient);
    if (!normalized.isValid) {
      return { success: false, status: 'FAILED', error: `Invalid recipient phone number: ${msg.recipient}` };
    }

    try {
      const vcard =
        `BEGIN:VCARD\n` +
        `VERSION:3.0\n` +
        `FN:${msg.fullName}\n` +
        (msg.organization ? `ORG:${msg.organization};\n` : '') +
        `TEL;type=CELL;type=VOICE;waid=${msg.phoneNumber.replace('+', '')}:${msg.phoneNumber}\n` +
        `END:VCARD`;

      const sent = await socket.sendMessage(normalized.jid, {
        contacts: {
          displayName: msg.fullName,
          contacts: [{ vcard }],
        },
      });

      return {
        success: true,
        status: 'SENT',
        messageId: sent?.key?.id || undefined,
        timestamp: Date.now(),
      };
    } catch (err: any) {
      logger.error({ err, recipient: msg.recipient }, 'Failed to send WhatsApp contact card');
      return { success: false, status: 'FAILED', error: err?.message || 'Failed to send contact card' };
    }
  }

  public async sendReaction(msg: OutboundReactionMessage): Promise<SendResult> {
    const socket = this.getActiveSocket();
    const normalized = normalizePhoneNumber(msg.recipient);
    if (!normalized.isValid) {
      return { success: false, status: 'FAILED', error: `Invalid recipient phone number: ${msg.recipient}` };
    }

    try {
      await socket.sendMessage(normalized.jid, {
        react: {
          text: msg.emoji,
          key: {
            remoteJid: normalized.jid,
            id: msg.messageId,
          },
        },
      });

      return { success: true, status: 'SENT', timestamp: Date.now() };
    } catch (err: any) {
      logger.error({ err, messageId: msg.messageId }, 'Failed to react to message');
      return { success: false, status: 'FAILED', error: err?.message || 'Failed to react' };
    }
  }

  public async sendInteractive(msg: OutboundInteractiveMessage): Promise<SendResult> {
    // Because native WhatsApp buttons often fail or are rejected on non-official WhatsApp clients,
    // we generate a clean numbered-response fallback text representation.
    const socket = this.getActiveSocket();
    const normalized = normalizePhoneNumber(msg.recipient);
    if (!normalized.isValid) {
      return { success: false, status: 'FAILED', error: `Invalid recipient phone number: ${msg.recipient}` };
    }

    let formattedText = `*${msg.title}*\n\n${msg.body}\n\n`;

    if (msg.buttons && msg.buttons.length > 0) {
      formattedText += `_Reply with the number of your choice:_\n`;
      msg.buttons.forEach((btn, idx) => {
        formattedText += `*${idx + 1}* - ${btn.label}\n`;
      });
    }

    if (msg.footer) {
      formattedText += `\n_${msg.footer}_`;
    }

    return this.sendText({
      recipient: msg.recipient,
      text: formattedText,
    });
  }

  public async deleteMessage(recipient: string, messageId: string): Promise<boolean> {
    const socket = this.getActiveSocket();
    const normalized = normalizePhoneNumber(recipient);
    try {
      await socket.sendMessage(normalized.jid, {
        delete: {
          remoteJid: normalized.jid,
          id: messageId,
          fromMe: true,
        },
      });
      return true;
    } catch (err) {
      logger.error({ err, messageId }, 'Failed to delete message');
      return false;
    }
  }
}

export const messageSender = new WhatsAppMessageSender();
