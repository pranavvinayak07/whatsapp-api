import { db } from '../db.js';
import { whatsappConnection } from '../baileys/connection.js';
import { messageSender } from '../baileys/message-sender.js';
import { queueService } from './queue-service.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

export class QueueWorker {
  private isRunning = false;
  private loopTimer: NodeJS.Timeout | null = null;
  private readonly pollIntervalMs = 2000;

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('Starting durable PostgreSQL queue worker');
    this.scheduleNextTick(100);
  }

  public stop() {
    this.isRunning = false;
    if (this.loopTimer) {
      clearTimeout(this.loopTimer);
      this.loopTimer = null;
    }
    logger.info('Queue worker stopped');
  }

  private scheduleNextTick(delayMs = this.pollIntervalMs) {
    if (!this.isRunning) return;
    if (this.loopTimer) clearTimeout(this.loopTimer);
    this.loopTimer = setTimeout(() => {
      this.loopTimer = null;
      void this.processNextBatch();
    }, delayMs);
  }

  private async processNextBatch() {
    try {
      // Interrupted deliveries have uncertain outcomes. Require explicit review/retry.
      await db.queuedMessage.updateMany({
        where: { status: 'PROCESSING', updatedAt: { lt: new Date(Date.now() - 10 * 60 * 1000) } },
        data: { status: 'FAILED', lastError: 'Worker lease expired; delivery outcome unknown. Check WhatsApp before retrying.' },
      });
      if (queueService.getPaused()) {
        return;
      }

      // Check WhatsApp connection
      const connectionStatus = whatsappConnection.getStatus().status;
      if (connectionStatus !== 'CONNECTED') {
        return;
      }

      // Fetch pending jobs
      const jobs = await db.queuedMessage.findMany({
        where: {
          status: 'PENDING',
          nextRunAt: { lte: new Date() },
        },
        orderBy: [{ priority: 'desc' }, { nextRunAt: 'asc' }],
        take: config.QUEUE_WORKER_CONCURRENCY,
      });

      if (jobs.length === 0) {
        return;
      }

      for (const job of jobs) {
        if (!this.isRunning || queueService.getPaused()) break;
        await this.processJob(job);
        // Throttle between messages to protect WhatsApp account reputation
        const throttleDelay = Math.max(1000, Math.floor(60000 / config.MAX_MESSAGES_PER_MINUTE));
        await new Promise((r) => setTimeout(r, throttleDelay));
      }
    } catch (err) {
      logger.error({ err }, 'Error during queue worker cycle');
    } finally {
      this.scheduleNextTick();
    }
  }

  private async processJob(job: any) {
    // Acquire lease
    const acquired = await db.queuedMessage.updateMany({
      where: { id: job.id, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    });

    if (acquired.count === 0) return; // Picked up by another worker

    const heartbeat = setInterval(() => {
      void db.queuedMessage.updateMany({
        where: { id: job.id, status: 'PROCESSING' }, data: { updatedAt: new Date() },
      }).catch((err) => logger.error({ err }, 'Queue lease heartbeat failed'));
    }, 30000);
    try {
      let result;
      const payload = job.payload as any;

      switch (job.messageType) {
        case 'TEXT':
          result = await messageSender.sendText({
            recipient: job.recipientPhone,
            text: payload.text || payload.message,
          });
          break;
        case 'IMAGE':
          result = await messageSender.sendImage({
            recipient: job.recipientPhone,
            mediaUrl: payload.mediaUrl,
            caption: payload.caption,
          });
          break;
        case 'DOCUMENT':
          result = await messageSender.sendDocument({
            recipient: job.recipientPhone,
            mediaUrl: payload.mediaUrl,
            fileName: payload.fileName,
            caption: payload.caption,
          });
          break;
        case 'VIDEO':
          result = await messageSender.sendVideo({
            recipient: job.recipientPhone,
            mediaUrl: payload.mediaUrl,
            caption: payload.caption,
          });
          break;
        case 'AUDIO':
          result = await messageSender.sendAudio(
            {
              recipient: job.recipientPhone,
              mediaUrl: payload.mediaUrl,
            },
            payload.isVoiceNote
          );
          break;
        case 'INTERACTIVE':
          result = await messageSender.sendInteractive({
            recipient: job.recipientPhone,
            title: payload.title,
            body: payload.body,
            footer: payload.footer,
            buttons: payload.buttons,
          });
          break;
        default:
          throw new Error(`Unsupported queued message type: ${job.messageType}`);
      }

      if (result.success) {
        await db.queuedMessage.update({
          where: { id: job.id },
          data: {
            status: 'SENT',
            lastError: null,
          },
        });
        logger.info({ jobId: job.id, recipient: job.recipientPhone }, 'Queued message sent successfully');
      } else {
        await this.handleJobFailure(job, result.error || 'Send operation returned failure');
      }
    } catch (err: any) {
      await this.handleJobFailure(job, err?.message || 'Unexpected exception during message send');
    } finally {
      clearInterval(heartbeat);
    }
  }

  private async handleJobFailure(job: any, errorMsg: string) {
    const nextRetry = job.retryCount + 1;
    const isExhausted = nextRetry >= job.maxRetries;

    if (isExhausted) {
      await db.queuedMessage.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          retryCount: nextRetry,
          lastError: errorMsg,
        },
      });
      logger.error({ jobId: job.id, attempts: nextRetry, error: errorMsg }, 'Queued message permanently failed');
    } else {
      const delayMs = Math.min(300000, 5000 * Math.pow(2, nextRetry));
      const nextRunAt = new Date(Date.now() + delayMs);

      await db.queuedMessage.update({
        where: { id: job.id },
        data: {
          status: 'PENDING',
          retryCount: nextRetry,
          nextRunAt,
          lastError: errorMsg,
        },
      });
      logger.warn({ jobId: job.id, nextAttempt: nextRetry, nextRunAt }, 'Scheduled message retry with backoff');
    }
  }
}

export const queueWorker = new QueueWorker();
