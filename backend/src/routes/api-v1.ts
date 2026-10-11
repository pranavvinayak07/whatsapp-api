import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { messageSender } from '../baileys/message-sender.js';
import { whatsappConnection } from '../baileys/connection.js';
import { queueService } from '../queue/queue-service.js';
import { ContactService } from '../services/contact-service.js';
import { AutomationEngine } from '../services/automation-engine.js';
import { requireApiKey } from '../middleware/api-key-middleware.js';

export const apiV1Router = Router();

// 1. Health check (Public / monitoring)
apiV1Router.get('/health', async (req: Request, res: Response) => {
  const conn = whatsappConnection.getStatus();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'vivegaa-whatsapp-api',
    whatsappStatus: conn.status,
    connectedPhone: conn.phoneNumber,
  });
});

// All subsequent routes require API Key
apiV1Router.use(requireApiKey);

// 2. Connection status
apiV1Router.get('/connection/status', (req: Request, res: Response) => {
  const { qrCode, ...status } = whatsappConnection.getStatus();
  res.json(status);
});

// 3. Queue status
apiV1Router.get('/queue/status', async (req: Request, res: Response) => {
  const stats = await queueService.getQueueStats();
  res.json(stats);
});

// Helper to normalize recipient phone numbers from various key names
function resolveRecipient(body: any): string | null {
  const r = body.recipient || body.phoneNumber || body.phone || body.to;
  if (!r) return null;
  return String(r).trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TEXT MESSAGE: POST /messages/text & POST /send/text
// ─────────────────────────────────────────────────────────────────────────────
const textSchema = z.object({
  recipient: z.string().min(8),
  message: z.string().optional(),
  text: z.string().optional(),
  quotedMessageId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  queue: z.boolean().optional().default(false),
});

const handleSendText = async (req: Request, res: Response) => {
  const body = {
    ...req.body,
    recipient: resolveRecipient(req.body),
    message: req.body.message || req.body.text,
  };

  const parsed = textSchema.safeParse(body);
  if (!parsed.success || (!parsed.data.message && !parsed.data.text)) {
    return res.status(400).json({ error: 'recipient (min 8 digits) and message text are required' });
  }

  const { recipient, message, quotedMessageId, idempotencyKey, queue } = parsed.data;
  const content = message || parsed.data.text || '';

  if (queue) {
    const job = await queueService.enqueue({
      recipient,
      messageType: 'TEXT',
      payload: { text: content },
      idempotencyKey,
    });
    return res.json({ queued: true, jobId: job.id, status: 'PENDING' });
  }

  const result = await messageSender.sendText({ recipient, text: content, quotedMessageId });
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }
  return res.json(result);
};

apiV1Router.post(['/messages/text', '/send/text'], handleSendText);

// ─────────────────────────────────────────────────────────────────────────────
// 5. IMAGE MESSAGE: POST /messages/image & POST /send/image
// ─────────────────────────────────────────────────────────────────────────────
const imageSchema = z.object({
  recipient: z.string().min(8),
  mediaUrl: z.string().url().optional(),
  url: z.string().url().optional(),
  caption: z.string().optional(),
  mimeType: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

const handleSendImage = async (req: Request, res: Response) => {
  const body = {
    ...req.body,
    recipient: resolveRecipient(req.body),
    mediaUrl: req.body.mediaUrl || req.body.url,
  };

  const parsed = imageSchema.safeParse(body);
  if (!parsed.success || !parsed.data.mediaUrl) {
    return res.status(400).json({ error: 'recipient and valid image mediaUrl (or url) are required' });
  }

  const result = await messageSender.sendImage({
    recipient: parsed.data.recipient,
    mediaUrl: parsed.data.mediaUrl,
    caption: parsed.data.caption,
    mimeType: parsed.data.mimeType || 'image/jpeg',
  });
  if (!result.success) return res.status(500).json({ error: result.error });
  return res.json(result);
};

apiV1Router.post(['/messages/image', '/send/image'], handleSendImage);

// ─────────────────────────────────────────────────────────────────────────────
// 6. DOCUMENT / PDF: POST /messages/document & POST /send/document
// ─────────────────────────────────────────────────────────────────────────────
const docSchema = z.object({
  recipient: z.string().min(8),
  mediaUrl: z.string().url().optional(),
  url: z.string().url().optional(),
  fileName: z.string().default('document.pdf'),
  caption: z.string().optional(),
  mimeType: z.string().optional(),
});

const handleSendDocument = async (req: Request, res: Response) => {
  const body = {
    ...req.body,
    recipient: resolveRecipient(req.body),
    mediaUrl: req.body.mediaUrl || req.body.url,
  };

  const parsed = docSchema.safeParse(body);
  if (!parsed.success || !parsed.data.mediaUrl) {
    return res.status(400).json({ error: 'recipient and valid document mediaUrl are required' });
  }

  const result = await messageSender.sendDocument({
    recipient: parsed.data.recipient,
    mediaUrl: parsed.data.mediaUrl,
    fileName: parsed.data.fileName || 'document.pdf',
    caption: parsed.data.caption,
    mimeType: parsed.data.mimeType || 'application/pdf',
  });
  if (!result.success) return res.status(500).json({ error: result.error });
  return res.json(result);
};

apiV1Router.post(['/messages/document', '/send/document', '/send/pdf'], handleSendDocument);

// ─────────────────────────────────────────────────────────────────────────────
// 7. VIDEO MESSAGE: POST /messages/video & POST /send/video
// ─────────────────────────────────────────────────────────────────────────────
const handleSendVideo = async (req: Request, res: Response) => {
  const recipient = resolveRecipient(req.body);
  const mediaUrl = req.body.mediaUrl || req.body.url;
  if (!recipient || !mediaUrl) {
    return res.status(400).json({ error: 'recipient and valid video mediaUrl (or url) are required' });
  }

  const result = await messageSender.sendVideo({
    recipient,
    mediaUrl,
    caption: req.body.caption,
  });
  if (!result.success) return res.status(500).json({ error: result.error });
  return res.json(result);
};

apiV1Router.post(['/messages/video', '/send/video'], handleSendVideo);

// ─────────────────────────────────────────────────────────────────────────────
// 8. AUDIO / VOICE NOTE: POST /messages/audio & POST /send/audio
// ─────────────────────────────────────────────────────────────────────────────
const handleSendAudio = async (req: Request, res: Response) => {
  const recipient = resolveRecipient(req.body);
  const mediaUrl = req.body.mediaUrl || req.body.url;
  if (!recipient || !mediaUrl) {
    return res.status(400).json({ error: 'recipient and valid audio mediaUrl (or url) are required' });
  }

  const isVoiceNote = Boolean(req.body.isVoiceNote ?? req.body.voiceNote ?? false);
  const result = await messageSender.sendAudio({ recipient, mediaUrl }, isVoiceNote);
  if (!result.success) return res.status(500).json({ error: result.error });
  return res.json(result);
};

apiV1Router.post(['/messages/audio', '/send/audio', '/send/voice'], handleSendAudio);

// ─────────────────────────────────────────────────────────────────────────────
// 9. LOCATION PIN: POST /messages/location & POST /send/location
// ─────────────────────────────────────────────────────────────────────────────
const handleSendLocation = async (req: Request, res: Response) => {
  const recipient = resolveRecipient(req.body);
  const lat = req.body.latitude ?? req.body.lat;
  const lng = req.body.longitude ?? req.body.lng;
  if (!recipient || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'recipient, latitude and longitude are required' });
  }

  const result = await messageSender.sendLocation({
    recipient,
    latitude: Number(lat),
    longitude: Number(lng),
    name: req.body.name,
    address: req.body.address,
  });
  if (!result.success) return res.status(500).json({ error: result.error });
  return res.json(result);
};

apiV1Router.post(['/messages/location', '/send/location'], handleSendLocation);

// ─────────────────────────────────────────────────────────────────────────────
// 10. CONTACT CARD: POST /messages/contact & POST /send/contact
// ─────────────────────────────────────────────────────────────────────────────
const handleSendContact = async (req: Request, res: Response) => {
  const recipient = resolveRecipient(req.body);
  const fullName = req.body.fullName || req.body.name || req.body.contact?.fullName;
  const phoneNumber = req.body.phoneNumber || req.body.phone || req.body.contact?.phoneNumber;

  if (!recipient || !fullName || !phoneNumber) {
    return res.status(400).json({ error: 'recipient, fullName, and phoneNumber are required' });
  }

  const result = await messageSender.sendContact({
    recipient,
    fullName,
    phoneNumber,
    organization: req.body.organization || req.body.contact?.organization,
  });
  if (!result.success) return res.status(500).json({ error: result.error });
  return res.json(result);
};

apiV1Router.post(['/messages/contact', '/send/contact'], handleSendContact);

// ─────────────────────────────────────────────────────────────────────────────
// 11. INTERACTIVE BUTTONS: POST /messages/interactive & POST /send/interactive
// ─────────────────────────────────────────────────────────────────────────────
const handleSendInteractive = async (req: Request, res: Response) => {
  const recipient = resolveRecipient(req.body);
  const title = req.body.title || 'Notice';
  const body = req.body.body || req.body.message || '';
  const buttons = req.body.buttons || [];

  if (!recipient || !body) {
    return res.status(400).json({ error: 'recipient and body text are required' });
  }

  const result = await messageSender.sendInteractive({
    recipient,
    title,
    body,
    footer: req.body.footer,
    buttons,
  });
  if (!result.success) return res.status(500).json({ error: result.error });
  return res.json(result);
};

apiV1Router.post(['/messages/interactive', '/send/interactive'], handleSendInteractive);

// ─────────────────────────────────────────────────────────────────────────────
// 12. UNIFIED TRANSMISSION ROUTE: POST /send & POST /messages
// Accepts type: TEXT | IMAGE | DOCUMENT | VIDEO | AUDIO | LOCATION | CONTACT | INTERACTIVE
// ─────────────────────────────────────────────────────────────────────────────
apiV1Router.post(['/send', '/messages'], async (req: Request, res: Response) => {
  const type = String(req.body.type || req.body.messageType || 'TEXT').toUpperCase();
  const recipient = resolveRecipient(req.body);

  if (!recipient) {
    return res.status(400).json({ error: 'recipient is required (e.g. 919876543210)' });
  }

  let result;
  switch (type) {
    case 'TEXT':
      result = await messageSender.sendText({
        recipient,
        text: req.body.message || req.body.text || '',
        quotedMessageId: req.body.quotedMessageId,
      });
      break;
    case 'IMAGE':
      result = await messageSender.sendImage({
        recipient,
        mediaUrl: req.body.mediaUrl || req.body.url,
        caption: req.body.caption,
      });
      break;
    case 'DOCUMENT':
    case 'PDF':
      result = await messageSender.sendDocument({
        recipient,
        mediaUrl: req.body.mediaUrl || req.body.url,
        fileName: req.body.fileName || 'document.pdf',
        caption: req.body.caption,
        mimeType: req.body.mimeType || 'application/pdf',
      });
      break;
    case 'VIDEO':
      result = await messageSender.sendVideo({
        recipient,
        mediaUrl: req.body.mediaUrl || req.body.url,
        caption: req.body.caption,
      });
      break;
    case 'AUDIO':
    case 'VOICE':
      result = await messageSender.sendAudio(
        { recipient, mediaUrl: req.body.mediaUrl || req.body.url },
        Boolean(req.body.isVoiceNote || type === 'VOICE')
      );
      break;
    case 'LOCATION':
      result = await messageSender.sendLocation({
        recipient,
        latitude: Number(req.body.latitude ?? req.body.lat),
        longitude: Number(req.body.longitude ?? req.body.lng),
        name: req.body.name,
        address: req.body.address,
      });
      break;
    case 'CONTACT':
      result = await messageSender.sendContact({
        recipient,
        fullName: req.body.fullName || req.body.name || req.body.contact?.fullName,
        phoneNumber: req.body.phoneNumber || req.body.phone || req.body.contact?.phoneNumber,
        organization: req.body.organization || req.body.contact?.organization,
      });
      break;
    case 'INTERACTIVE':
      result = await messageSender.sendInteractive({
        recipient,
        title: req.body.title || 'Notice',
        body: req.body.body || req.body.message || '',
        footer: req.body.footer,
        buttons: req.body.buttons || [],
      });
      break;
    default:
      return res.status(400).json({
        error: `Unsupported type '${type}'. Supported types: TEXT, IMAGE, DOCUMENT, VIDEO, AUDIO, LOCATION, CONTACT, INTERACTIVE`,
      });
  }

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }
  return res.json(result);
});

// 13. POST /messages/reply
apiV1Router.post(['/messages/reply', '/send/reply'], async (req: Request, res: Response) => {
  const recipient = resolveRecipient(req.body);
  if (!recipient) return res.status(400).json({ error: 'recipient is required' });

  const result = await messageSender.sendText({
    recipient,
    text: req.body.message || req.body.text || '',
    quotedMessageId: req.body.quotedMessageId,
  });
  if (!result.success) return res.status(500).json({ error: result.error });
  return res.json(result);
});

// 14. POST /messages/reaction
apiV1Router.post(['/messages/reaction', '/send/reaction'], async (req: Request, res: Response) => {
  const result = await messageSender.sendReaction(req.body);
  if (!result.success) return res.status(500).json({ error: result.error });
  return res.json(result);
});

// 15. GET /messages/:id
apiV1Router.get('/messages/:id', async (req: Request, res: Response) => {
  const message = await db.message.findFirst({
    where: {
      OR: [{ id: req.params.id }, { whatsappMessageId: req.params.id }],
    },
    include: { attachments: true, statusEvents: true },
  });
  if (!message) return res.status(404).json({ error: 'Message not found' });
  return res.json(message);
});

// 16. GET /messages (Paginated list)
apiV1Router.get('/messages', async (req: Request, res: Response) => {
  const limit = Math.min(100, Number(req.query.limit) || 20);
  const page = Math.max(1, Number(req.query.page) || 1);
  const skip = (page - 1) * limit;

  const [total, messages] = await Promise.all([
    db.message.count(),
    db.message.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { attachments: true },
    }),
  ]);

  return res.json({ total, page, limit, messages });
});

// 17. Contacts
apiV1Router.get('/contacts', async (req: Request, res: Response) => {
  const contacts = await db.contact.findMany({
    orderBy: { fullName: 'asc' },
    take: 200,
  });
  return res.json(contacts);
});

apiV1Router.post('/contacts', async (req: Request, res: Response) => {
  try {
    const contact = await ContactService.createContact(req.body);
    return res.status(201).json(contact);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiV1Router.post('/contacts/import', async (req: Request, res: Response) => {
  const { csvContent } = req.body;
  if (!csvContent) return res.status(400).json({ error: 'csvContent is required' });
  const result = await ContactService.importCsvContacts(csvContent);
  return res.json(result);
});

// 18. Templates
apiV1Router.get('/templates', async (req: Request, res: Response) => {
  const templates = await db.messageTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  return res.json(templates);
});

apiV1Router.post('/templates', async (req: Request, res: Response) => {
  const { name, code, category, body } = req.body;
  const created = await db.messageTemplate.create({
    data: { name, code, category, body },
  });
  return res.status(201).json(created);
});

// 19. Automation Events (From Vivegaa School ERP with direct transmission fallback)
apiV1Router.post('/automation/events', async (req: Request, res: Response) => {
  try {
    const recipient = resolveRecipient(req.body);
    // If explicit type and recipient or message are given, dispatch directly without database rule lookup
    if (recipient && (req.body.message || req.body.text)) {
      const result = await messageSender.sendText({
        recipient,
        text: req.body.message || req.body.text,
      });
      return res.json(result);
    }

    const result = await AutomationEngine.processEvent(req.body);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
