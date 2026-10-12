import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';
import { logger } from './utils/logger.js';
import { whatsappConnection } from './baileys/connection.js';
import { requireAuth, requireRoles } from './middleware/auth-middleware.js';
import { requireApiKey } from './middleware/api-key-middleware.js';
import { queueWorker } from './queue/queue-worker.js';
import { apiV1Router } from './routes/api-v1.js';
import { adminApiRouter } from './routes/admin-api.js';

const app = express();
app.set('trust proxy', 1);

app.use(
  cors({
    origin: config.PUBLIC_APP_URL,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Media downloads endpoint
app.get('/api/v1/media/download/:filename', requireApiKey, (req: Request, res: Response) => {
  const filePath = path.join(config.MEDIA_STORAGE_DIR, path.basename(req.params.filename));
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Media file not found' });
  }
});

// SSE endpoint for live dashboard connection status and QR stream
app.get('/admin/api/events/sse', requireAuth, requireRoles('SUPER_ADMIN', 'ADMIN'), (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial state immediately
  res.write(`data: ${JSON.stringify({ type: 'status', payload: whatsappConnection.getStatus() })}\n\n`);

  const unsubscribe = whatsappConnection.subscribe((event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

// Mount Routes
app.use('/api/v1', apiV1Router);
app.use('/admin/api', adminApiRouter);

// Start Server
const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Vivegaa WhatsApp Backend running');

  // Auto-connect if credentials exist in auth dir
  if (fs.existsSync(config.BAILEYS_AUTH_DIR) && fs.readdirSync(config.BAILEYS_AUTH_DIR).length > 0) {
    logger.info('Saved WhatsApp authentication state detected. Initiating connection...');
    whatsappConnection.connect().catch((err) => {
      logger.warn({ err }, 'Auto-connection attempt failed on startup');
    });
  }

  // Start durable queue worker
  if (config.MESSAGE_QUEUE_ENABLED) {
    queueWorker.start();
  }
});

// Graceful shutdown
const handleShutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down gracefully...');
  queueWorker.stop();
  await whatsappConnection.disconnect();
  server.close(() => {
    logger.info('Server closed. Process exiting.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
