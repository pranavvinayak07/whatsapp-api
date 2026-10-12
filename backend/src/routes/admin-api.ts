import { groupService } from '../services/group-service.js';
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db.js';
import { config } from '../config.js';
import { AuthService } from '../services/auth-service.js';
import { whatsappConnection } from '../baileys/connection.js';
import { messageSender } from '../baileys/message-sender.js';
import { queueService } from '../queue/queue-service.js';
import { ContactService } from '../services/contact-service.js';
import { TemplateService } from '../services/template-service.js';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../middleware/auth-middleware.js';
import { auditAction } from '../middleware/audit-middleware.js';
import { generateApiKey } from '../utils/crypto.js';

export const adminApiRouter = Router();

// Multer storage for media uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(config.MEDIA_STORAGE_DIR)) {
      fs.mkdirSync(config.MEDIA_STORAGE_DIR, { recursive: true });
    }
    cb(null, config.MEDIA_STORAGE_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    cb(null, unique);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

// ----------------------------------------------------
import { loginRateLimiter, loginRateLimitMiddleware } from '../middleware/rate-limiter.js';

// ----------------------------------------------------
// 1. PUBLIC AUTHENTICATION & BOOTSTRAP ENDPOINTS
// ----------------------------------------------------

adminApiRouter.get('/auth/bootstrap/status', async (req: Request, res: Response) => {
  try {
    const isNeeded = await AuthService.checkBootstrapStatus();
    res.json({ bootstrapNeeded: isNeeded });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check bootstrap status' });
  }
});

adminApiRouter.post('/auth/bootstrap', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const admin = await AuthService.bootstrapAdmin({ email, password, name: name || 'Super Admin' });
    res.json({
      success: true,
      message: 'Super administrator created successfully. Bootstrap is now disabled.',
      admin,
    });
  } catch (err: any) {
    const status = err.message?.includes('Forbidden') ? 403 : 400;
    res.status(status).json({ error: err.message });
  }
});

adminApiRouter.post('/auth/login', loginRateLimitMiddleware, async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const ipAddress = (req.ip || req.socket.remoteAddress || '').toString();
    const userAgent = (req.headers['user-agent'] || '').toString();
    const oldToken = req.cookies?.token;

    let oldSessionId: string | undefined;
    if (oldToken) {
      try {
        const decoded = AuthService.verifyToken(oldToken);
        oldSessionId = decoded.sessionId;
      } catch {
        // ignore expired old token
      }
    }

    const result = await AuthService.authenticate(email, password, {
      ipAddress,
      userAgent,
      oldSessionId,
    });

    loginRateLimiter.recordSuccess(req);

    const maxAge = rememberMe
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : 7 * 24 * 60 * 60 * 1000;  // 7 days

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    res.json({
      success: true,
      user: result.user,
      sessionId: result.sessionId,
    });
  } catch (err: any) {
    const failureInfo = loginRateLimiter.recordFailure(req);
    res.status(401).json({
      error: err.message || 'Invalid email or password',
      remainingAttempts: failureInfo.remaining,
    });
  }
});

adminApiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const token = req.cookies?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : undefined);
  if (token) {
    AuthService.logout(token);
  }
  res.clearCookie('token', { path: '/' });
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.json({ success: true, message: 'Logged out successfully' });
});

// ----------------------------------------------------
// ALL SUBSEQUENT ADMIN API ROUTES REQUIRE AUTHENTICATION
// ----------------------------------------------------
adminApiRouter.use(requireAuth);

adminApiRouter.get('/auth/me', (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// ----------------------------------------------------
// 2. WHATSAPP CONNECTION MANAGEMENT
// ----------------------------------------------------
adminApiRouter.get('/connection/status', requireRoles('SUPER_ADMIN', 'ADMIN'), (req: Request, res: Response) => {
  res.json(whatsappConnection.getStatus());
});

adminApiRouter.post('/connection/connect', requireRoles('SUPER_ADMIN', 'ADMIN'), async (req: Request, res: Response) => {
  whatsappConnection.connect().catch(() => {});
  res.json({ message: 'WhatsApp connection initiated', status: whatsappConnection.getStatus() });
});

adminApiRouter.post('/connection/disconnect', requireRoles('SUPER_ADMIN', 'ADMIN'), async (req: Request, res: Response) => {
  await whatsappConnection.disconnect();
  res.json({ message: 'Disconnected', status: whatsappConnection.getStatus() });
});

adminApiRouter.post('/connection/logout', requireRoles('SUPER_ADMIN', 'ADMIN'), async (req: Request, res: Response) => {
  await whatsappConnection.logout();
  res.json({ message: 'Logged out and auth state cleared', status: whatsappConnection.getStatus() });
});

adminApiRouter.get('/connection/summary', (req: Request, res: Response) => {
  const { status, phoneNumber } = whatsappConnection.getStatus();
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status, phoneNumber: status === 'CONNECTED' ? phoneNumber : null });
});

adminApiRouter.get('/groups', requireRoles('SUPER_ADMIN', 'ADMIN', 'MESSAGING_STAFF'), async (req: Request, res: Response) => {
  try { res.json(await groupService.list()); }
  catch (err: any) { res.status(503).json({ error: err.message }); }
});
adminApiRouter.post('/groups/:id/messages', requireRoles('SUPER_ADMIN', 'ADMIN', 'MESSAGING_STAFF'), async (req: Request, res: Response) => {
  if (typeof req.body.text !== 'string') return res.status(400).json({ error: 'Message text is required.' });
  try { res.json(await groupService.send(req.params.id, req.body.text)); }
  catch (err: any) { res.status(400).json({ error: err.message }); }
});

// ----------------------------------------------------
// 3. INBOX & CONVERSATIONS
// ----------------------------------------------------
adminApiRouter.get('/inbox/conversations', async (req: Request, res: Response) => {
  const conversations = await db.conversation.findMany({
    orderBy: { lastMessageAt: 'desc' },
    include: { contact: true, assignedStaff: { select: { id: true, name: true } } },
    take: 100,
  });
  res.json(conversations);
});

adminApiRouter.get('/inbox/conversations/:id/messages', async (req: Request, res: Response) => {
  const messages = await db.message.findMany({
    where: { conversationId: req.params.id },
    orderBy: { createdAt: 'asc' },
    include: { attachments: true },
    take: 100,
  });

  // Mark unread as read
  await db.conversation.update({
    where: { id: req.params.id },
    data: { unreadCount: 0 },
  });

  res.json(messages);
});

adminApiRouter.post('/inbox/conversations/:id/reply', requireRoles('SUPER_ADMIN', 'ADMIN', 'MESSAGING_STAFF'), async (req: AuthenticatedRequest, res: Response) => {
  const { text, quotedMessageId } = req.body;
  const conversation = await db.conversation.findUnique({
    where: { id: req.params.id },
    include: { contact: true },
  });

  if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

  const phone = conversation.contact?.phoneNumber || conversation.remoteJid.split('@')[0];
  const result = await messageSender.sendText({ recipient: phone, text, quotedMessageId });

  if (result.success) {
    const connPhone = whatsappConnection.getStatus().phoneNumber;
    const senderJid = connPhone ? `${connPhone.replace(/^\+/, '')}@s.whatsapp.net` : 'self';

    const created = await db.message.create({
      data: {
        conversationId: conversation.id,
        whatsappMessageId: result.messageId,
        direction: 'OUTBOUND',
        senderJid,
        recipientJid: conversation.remoteJid,
        textContent: text,
        status: 'SENT',
        quotedMessageId,
      },
    });

    await db.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessageSnippet: text.substring(0, 100),
      },
    });

    return res.json(created);
  }

  res.status(500).json({ error: result.error });
});

// ----------------------------------------------------
// 4. CONTACTS
// ----------------------------------------------------
adminApiRouter.get('/contacts', async (req: Request, res: Response) => {
  const contacts = await db.contact.findMany({
    orderBy: { fullName: 'asc' },
  });
  res.json(contacts);
});

adminApiRouter.post('/contacts', requireRoles('SUPER_ADMIN', 'ADMIN', 'MESSAGING_STAFF'), async (req: Request, res: Response) => {
  try {
    const contact = await ContactService.createContact(req.body);
    res.status(201).json(contact);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminApiRouter.delete('/contacts/:id', requireRoles('SUPER_ADMIN', 'ADMIN'), async (req: Request, res: Response) => {
  await db.contact.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ----------------------------------------------------
// 5. TEMPLATES
// ----------------------------------------------------
adminApiRouter.get('/templates', async (req: Request, res: Response) => {
  const templates = await db.messageTemplate.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(templates);
});

adminApiRouter.post('/templates', requireRoles('SUPER_ADMIN', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, code, category, body } = req.body;
  const variables = TemplateService.extractVariables(body);

  const template = await db.messageTemplate.create({
    data: {
      name,
      code,
      category,
      body,
      variables,
      createdById: req.user?.userId,
    },
  });

  res.status(201).json(template);
});

adminApiRouter.post('/templates/preview', (req: Request, res: Response) => {
  const { body, variables } = req.body;
  const rendered = TemplateService.render(body, variables || {});
  const validation = TemplateService.validateRequiredVariables(body, variables || {});
  res.json({ rendered, ...validation });
});

// ----------------------------------------------------
// 6. QUEUE & SCHEDULED MESSAGES
// ----------------------------------------------------
adminApiRouter.get('/queue', async (req: Request, res: Response) => {
  const stats = await queueService.getQueueStats();
  const jobs = await db.queuedMessage.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ stats, jobs });
});

adminApiRouter.post('/queue/toggle-pause', requireRoles('SUPER_ADMIN', 'ADMIN'), (req: Request, res: Response) => {
  const current = queueService.getPaused();
  queueService.setPaused(!current);
  res.json({ isPaused: queueService.getPaused() });
});

adminApiRouter.post('/queue/:id/retry', requireRoles('SUPER_ADMIN', 'ADMIN'), async (req: Request, res: Response) => {
  const job = await queueService.retryFailedMessage(req.params.id);
  res.json(job);
});

// ----------------------------------------------------
// 7. MEDIA LIBRARY
// ----------------------------------------------------
adminApiRouter.post('/media/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  res.json({
    fileName: req.file.originalname,
    storedName: req.file.filename,
    size: req.file.size,
    mimeType: req.file.mimetype,
    url: `/api/v1/media/download/${req.file.filename}`,
  });
});

adminApiRouter.get('/media', async (req: Request, res: Response) => {
  const attachments = await db.messageAttachment.findMany({
    orderBy: { createdAt: 'desc' },
    take: 60,
  });
  res.json(attachments);
});

// ----------------------------------------------------
// 8. ANALYTICS & STATS
// ----------------------------------------------------
adminApiRouter.get('/analytics', async (req: Request, res: Response) => {
  const [totalMessages, sentCount, deliveredCount, readCount, failedCount, activeConversations, queueStats] =
    await Promise.all([
      db.message.count(),
      db.message.count({ where: { status: 'SENT' } }),
      db.message.count({ where: { status: 'DELIVERED' } }),
      db.message.count({ where: { status: 'READ' } }),
      db.message.count({ where: { status: 'FAILED' } }),
      db.conversation.count(),
      queueService.getQueueStats(),
    ]);

  res.json({
    totalMessages,
    sentCount,
    deliveredCount,
    readCount,
    failedCount,
    activeConversations,
    queueStats,
    connection: { status: whatsappConnection.getStatus().status },
  });
});

// ----------------------------------------------------
// 9. USER MANAGEMENT & API KEYS
// ----------------------------------------------------
adminApiRouter.get('/users', requireRoles('SUPER_ADMIN', 'ADMIN'), async (req: Request, res: Response) => {
  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(users);
});

adminApiRouter.post('/users', requireRoles('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const user = await AuthService.createUser(req.body);
    res.status(201).json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

adminApiRouter.use('/api-keys', (req: Request, res: Response, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

adminApiRouter.get('/api-keys', requireRoles('SUPER_ADMIN', 'ADMIN'), async (req: Request, res: Response) => {
  const keys = await db.apiKey.findMany({
    select: { id: true, name: true, keyPrefix: true, scopes: true, isRevoked: true, lastUsedAt: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(keys);
});

adminApiRouter.post('/api-keys', requireRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, scopes } = req.body;
  const { rawKey, keyPrefix, keyHash } = generateApiKey();

  const created = await db.apiKey.create({
    data: {
      name: name || 'ERP Integration Key',
      keyPrefix,
      keyHash,
      scopes: scopes || ['messages:write', 'contacts:read'],
      createdById: req.user?.userId,
    },
  });

  res.status(201).json({
    apiKey: rawKey,
    keyPrefix: created.keyPrefix,
    name: created.name,
    message: 'Store this key safely now. It will not be shown again.',
  });
});

adminApiRouter.delete('/api-keys/:id', requireRoles('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const result = await db.apiKey.deleteMany({ where: { id: req.params.id } });
    if (!result.count) return res.status(404).json({ error: 'Key not found.' });
    res.json({ success: true });
  } catch { res.status(500).json({ error: 'Could not delete key.' }); }
});
adminApiRouter.post('/api-keys/:id/rotate', requireRoles('SUPER_ADMIN'), async (req: Request, res: Response) => {
  try {
    const { rawKey, keyPrefix, keyHash } = generateApiKey();
    const result = await db.apiKey.updateMany({
      where: { id: req.params.id, isRevoked: false },
      data: { keyPrefix, keyHash, lastUsedAt: null },
    });
    if (!result.count) return res.status(404).json({ error: 'Active key not found.' });
    res.json({ apiKey: rawKey });
  } catch { res.status(500).json({ error: 'Could not replace key.' }); }
});

// ----------------------------------------------------
// 10. SYSTEM LOGS & AUDIT TRAIL
// ----------------------------------------------------
adminApiRouter.get('/logs', requireRoles('SUPER_ADMIN', 'ADMIN'), async (req: Request, res: Response) => {
  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(logs);
});
