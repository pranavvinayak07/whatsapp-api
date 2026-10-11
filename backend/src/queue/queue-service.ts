import { db } from '../db.js';
import { normalizePhoneNumber } from '../utils/phone.js';
import { logger } from '../utils/logger.js';

export interface EnqueueOptions {
  recipient: string;
  messageType: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'AUDIO' | 'INTERACTIVE';
  payload: any;
  idempotencyKey?: string;
  priority?: number;
  scheduledFor?: Date;
}

class QueueService {
  private isPaused = false;

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    logger.info({ isPaused: this.isPaused }, 'Message queue pause state changed');
  }

  public getPaused(): boolean {
    return this.isPaused;
  }

  public async enqueue(options: EnqueueOptions) {
    const normalized = normalizePhoneNumber(options.recipient);
    if (!normalized.isValid) {
      throw new Error(`Invalid recipient phone number: ${options.recipient}`);
    }

    // Check idempotency
    if (options.idempotencyKey) {
      const existing = await db.queuedMessage.findUnique({
        where: { idempotencyKey: options.idempotencyKey },
      });
      if (existing) {
        logger.info({ idempotencyKey: options.idempotencyKey }, 'Queued message already exists; reusing');
        return existing;
      }
    }

    return db.queuedMessage.create({
      data: {
        recipientPhone: normalized.e164,
        recipientJid: normalized.jid,
        messageType: options.messageType as any,
        payload: options.payload,
        status: 'PENDING',
        priority: options.priority || 0,
        nextRunAt: options.scheduledFor || new Date(),
        idempotencyKey: options.idempotencyKey,
      },
    });
  }

  public async getQueueStats() {
    const [pending, processing, sent, failed, cancelled] = await Promise.all([
      db.queuedMessage.count({ where: { status: 'PENDING' } }),
      db.queuedMessage.count({ where: { status: 'PROCESSING' } }),
      db.queuedMessage.count({ where: { status: 'SENT' } }),
      db.queuedMessage.count({ where: { status: 'FAILED' } }),
      db.queuedMessage.count({ where: { status: 'CANCELLED' } }),
    ]);

    return {
      isPaused: this.isPaused,
      pending,
      processing,
      sent,
      failed,
      cancelled,
      total: pending + processing + sent + failed + cancelled,
    };
  }

  public async cancelQueuedMessage(id: string) {
    return db.queuedMessage.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  public async retryFailedMessage(id: string) {
    return db.queuedMessage.update({
      where: { id },
      data: {
        status: 'PENDING',
        retryCount: 0,
        nextRunAt: new Date(),
        lastError: null,
      },
    });
  }
}

export const queueService = new QueueService();
