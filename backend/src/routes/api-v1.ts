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

// 4. POST /messages/text
const textSchema = z.object({
  recipient: z.string().min(8),
  message: z.string().min(1),
  quotedMessageId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  queue: z.boolean().optional().default(false),
});

apiV1Router.post('/messages/text', async (req: Request, res: Response) => {
  const parsed = textSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  const { recipient, message, quotedMessageId, idempotencyKey, queue } = parsed.data;

  if (queue) {
    const job = await queueService.enqueue({
      recipient,
      messageType: 'TEXT',
      payload: { text: message },
      idempotencyKey,
    });
    return res.json({ queued: true, jobId: job.id, status: 'PENDING' });
  }

  const result = await messageSender.sendText({ recipient, text: message, quotedMessageId });
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  res.json(result);
});

// 5. POST /messages/image
const imageSchema = z.object({
  recipient: z.string().min(8),
  mediaUrl: z.string().url().optional(),
  caption: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

apiV1Router.post('/messages/image', async (req: Request, res: Response) => {
  const parsed = imageSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const result = await messageSender.sendImage(parsed.data);
  if (!result.success) return res.status(500).json({ error: result.error });
  res.json(result);
});

// 6. POST /messages/document
const docSchema = z.object({
  recipient: z.string().min(8),
  mediaUrl: z.string().url(),
  fileName: z.string().default('document.pdf'),
  caption: z.string().optional(),
  mimeType: z.string().optional(),
});

apiV1Router.post('/messages/document', async (req: Request, res: Response) => {
  const parsed = docSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.format() });

  const result = await messageSender.sendDocument(parsed.data);
  if (!result.success) return res.status(500).json({ error: result.error });
  res.json(result);
});

// 7. POST /messages/video
apiV1Router.post('/messages/video', async (req: Request, res: Response) => {
  const result = await messageSender.sendVideo(req.body);
  if (!result.success) return res.status(500).json({ error: result.error });
  res.json(result);
});

// 8. POST /messages/audio
apiV1Router.post('/messages/audio', async (req: Request, res: Response) => {
  const result = await messageSender.sendAudio(req.body, Boolean(req.body.isVoiceNote));
  if (!result.success) return res.status(500).json({ error: result.error });
  res.json(result);
});

// 9. POST /messages/location
apiV1Router.post('/messages/location', async (req: Request, res: Response) => {
  const result = await messageSender.sendLocation(req.body);
  if (!result.success) return res.status(500).json({ error: result.error });
  res.json(result);
});

// 10. POST /messages/contact
apiV1Router.post('/messages/contact', async (req: Request, res: Response) => {
  const result = await messageSender.sendContact(req.body);
  if (!result.success) return res.status(500).json({ error: result.error });
  res.json(result);
});

// 11. POST /messages/interactive
apiV1Router.post('/messages/interactive', async (req: Request, res: Response) => {
  const result = await messageSender.sendInteractive(req.body);
  if (!result.success) return res.status(500).json({ error: result.error });
  res.json(result);
});

// 12. POST /messages/reply
apiV1Router.post('/messages/reply', async (req: Request, res: Response) => {
  const result = await messageSender.sendText({
    recipient: req.body.recipient,
    text: req.body.message,
    quotedMessageId: req.body.quotedMessageId,
  });
  if (!result.success) return res.status(500).json({ error: result.error });
  res.json(result);
});

// 13. POST /messages/reaction
apiV1Router.post('/messages/reaction', async (req: Request, res: Response) => {
  const result = await messageSender.sendReaction(req.body);
  if (!result.success) return res.status(500).json({ error: result.error });
  res.json(result);
});

// 14. GET /messages/:id
apiV1Router.get('/messages/:id', async (req: Request, res: Response) => {
  const message = await db.message.findFirst({
    where: {
      OR: [{ id: req.params.id }, { whatsappMessageId: req.params.id }],
    },
    include: { attachments: true, statusEvents: true },
  });
  if (!message) return res.status(404).json({ error: 'Message not found' });
  res.json(message);
});

// 15. GET /messages (Paginated list)
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

  res.json({ total, page, limit, messages });
});

// 16. Contacts
apiV1Router.get('/contacts', async (req: Request, res: Response) => {
  const contacts = await db.contact.findMany({
    orderBy: { fullName: 'asc' },
    take: 200,
  });
  res.json(contacts);
});

apiV1Router.post('/contacts', async (req: Request, res: Response) => {
  try {
    const contact = await ContactService.createContact(req.body);
    res.status(201).json(contact);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiV1Router.post('/contacts/import', async (req: Request, res: Response) => {
  const { csvContent } = req.body;
  if (!csvContent) return res.status(400).json({ error: 'csvContent is required' });
  const result = await ContactService.importCsvContacts(csvContent);
  res.json(result);
});

// 17. Templates
apiV1Router.get('/templates', async (req: Request, res: Response) => {
  const templates = await db.messageTemplate.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  res.json(templates);
});

apiV1Router.post('/templates', async (req: Request, res: Response) => {
  const { name, code, category, body } = req.body;
  const created = await db.messageTemplate.create({
    data: { name, code, category, body },
  });
  res.status(201).json(created);
});

// 18. Automation Events (From Vivegaa School ERP)
apiV1Router.post('/automation/events', async (req: Request, res: Response) => {
  try {
    const result = await AutomationEngine.processEvent(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 19. Campaigns
apiV1Router.post('/campaigns', async (req: Request, res: Response) => {
  const { title, description, category, targetFilter } = req.body;
  const campaign = await db.campaign.create({
    data: { title, description, category, targetFilter, status: 'DRAFT' },
  });
  res.status(201).json(campaign);
});

apiV1Router.get('/campaigns/:id', async (req: Request, res: Response) => {
  const campaign = await db.campaign.findUnique({
    where: { id: req.params.id },
    include: { recipients: { take: 50 } },
  });
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  res.json(campaign);
});
