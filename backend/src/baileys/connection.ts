import fs from 'fs';
import { setupBaileysEventHandlers } from './event-handler.js';
import path from 'path';
import QRCode from 'qrcode';
import { Boom } from '@hapi/boom';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  WASocket,
  ConnectionState as BaileysConnectionState,
} from '@whiskeysockets/baileys';
import { config } from '../config.js';
import { db } from '../db.js';
import { logger } from '../utils/logger.js';
import { ConnectionState } from './types.js';

class WhatsAppConnectionManager {
  private socket: WASocket | null = null;
  private currentStatus: ConnectionState = 'DISCONNECTED';
  private qrCodeDataUrl: string | null = null;
  private connectedPhone: string | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventListeners: Array<(event: { type: string; payload: any }) => void> = [];

  constructor() {
    // Ensure auth directory exists
    if (!fs.existsSync(config.BAILEYS_AUTH_DIR)) {
      fs.mkdirSync(config.BAILEYS_AUTH_DIR, { recursive: true });
    }
  }

  public getSocket(): WASocket | null {
    return this.socket;
  }

  public getStatus(): {
    status: ConnectionState;
    phoneNumber: string | null;
    qrCode: string | null;
    reconnectAttempts: number;
  } {
    return {
      status: this.currentStatus,
      phoneNumber: this.connectedPhone,
      qrCode: this.qrCodeDataUrl,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  public subscribe(listener: (event: { type: string; payload: any }) => void): () => void {
    this.eventListeners.push(listener);
    return () => {
      this.eventListeners = this.eventListeners.filter((l) => l !== listener);
    };
  }

  private broadcast(type: string, payload: any) {
    for (const listener of this.eventListeners) {
      try {
        listener({ type, payload });
      } catch (err) {
        logger.error({ err }, 'Error broadcasting connection event');
      }
    }
  }

  private async updateDbStatus(status: ConnectionState, reason?: string) {
    try {
      await db.whatsAppConnection.upsert({
        where: { id: 'default-connection' },
        create: {
          id: 'default-connection',
          name: 'Primary School Line',
          status: status as any,
          phoneNumber: this.connectedPhone,
          qrCode: this.qrCodeDataUrl,
          disconnectReason: reason,
          lastConnectedAt: status === 'CONNECTED' ? new Date() : undefined,
          lastDisconnectedAt: status === 'DISCONNECTED' ? new Date() : undefined,
          reconnectAttempts: this.reconnectAttempts,
        },
        update: {
          status: status as any,
          phoneNumber: this.connectedPhone,
          qrCode: this.qrCodeDataUrl,
          disconnectReason: reason,
          lastConnectedAt: status === 'CONNECTED' ? new Date() : undefined,
          lastDisconnectedAt: status === 'DISCONNECTED' ? new Date() : undefined,
          reconnectAttempts: this.reconnectAttempts,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to persist WhatsApp connection status in database');
    }
  }

  public async connect(): Promise<void> {
    if (['CONNECTING', 'QR_REQUIRED', 'CONNECTED'].includes(this.currentStatus)) {
      logger.info('WhatsApp already connected');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.currentStatus = 'CONNECTING';
    this.broadcast('status', { status: this.currentStatus });
    await this.updateDbStatus('CONNECTING');

    try {
      const { state, saveCreds } = await useMultiFileAuthState(config.BAILEYS_AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();

      logger.info({ version }, 'Initializing Baileys WhatsApp multi-device socket');

      this.socket = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: logger.child({ module: 'baileys' }) as any,
        browser: ['Vivegaa ERP', 'Chrome', '1.0.0'],
        syncFullHistory: false,
        markOnlineOnConnect: true,
      });

      const socket = this.socket;
      setupBaileysEventHandlers(socket);
      socket.ev.on('creds.update', saveCreds);

      this.socket.ev.on('connection.update', async (update: Partial<BaileysConnectionState>) => {
        if (this.socket !== socket) return;
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
            this.currentStatus = 'QR_REQUIRED';
            this.broadcast('qr', { qrCode: this.qrCodeDataUrl });
            this.broadcast('status', { status: this.currentStatus });
            await this.updateDbStatus('QR_REQUIRED');
            logger.info('New WhatsApp pairing QR generated');
          } catch (qrErr) {
            logger.error({ qrErr }, 'Failed to generate QR data URL');
          }
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          const reason = lastDisconnect?.error?.message || `Status Code ${statusCode}`;

          logger.warn({ statusCode, reason }, 'WhatsApp connection closed');
          this.qrCodeDataUrl = null;

          if (isLoggedOut) {
            this.currentStatus = 'DISCONNECTED';
            this.connectedPhone = null;
            this.reconnectAttempts = 0;
            this.broadcast('status', { status: this.currentStatus, reason: 'Logged out from device' });
            await this.updateDbStatus('DISCONNECTED', 'Logged out');
            await this.clearAuthState();
          } else {
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              this.reconnectAttempts++;
              this.currentStatus = 'RECONNECTING';
              const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
              logger.info({ attempt: this.reconnectAttempts, delayMs: delay }, 'Scheduling reconnection');

              this.broadcast('status', { status: this.currentStatus, attempt: this.reconnectAttempts });
              await this.updateDbStatus('RECONNECTING', reason);

              this.reconnectTimer = setTimeout(() => {
                this.connect().catch((e) => logger.error({ e }, 'Reconnection attempt failed'));
              }, delay);
            } else {
              this.currentStatus = 'ERROR';
              this.broadcast('status', { status: this.currentStatus, reason: 'Max reconnection attempts exceeded' });
              await this.updateDbStatus('ERROR', 'Max reconnection attempts exceeded');
            }
          }
        } else if (connection === 'open') {
          this.reconnectAttempts = 0;
          this.currentStatus = 'CONNECTED';
          this.qrCodeDataUrl = null;

          const jid = this.socket?.user?.id;
          if (jid) {
            const rawNum = jid.split('@')[0].split(':')[0];
            this.connectedPhone = `+${rawNum}`;
          }

          logger.info({ phone: this.connectedPhone }, 'WhatsApp connection established successfully');
          this.broadcast('status', { status: this.currentStatus, phoneNumber: this.connectedPhone });
          await this.updateDbStatus('CONNECTED');
        }
      });
    } catch (err: any) {
      logger.error({ err }, 'Failed to initialize WhatsApp socket');
      this.currentStatus = 'ERROR';
      this.broadcast('status', { status: 'ERROR', reason: err?.message });
      await this.updateDbStatus('ERROR', err?.message);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      const socket = this.socket;
      this.socket = null;
      try {
        socket.end(undefined);
      } catch (e) {
        logger.warn({ e }, 'Error closing socket');
      }
      this.socket = null;
    }
    this.currentStatus = 'DISCONNECTED';
    this.qrCodeDataUrl = null;
    this.broadcast('status', { status: 'DISCONNECTED' });
    await this.updateDbStatus('DISCONNECTED', 'Manual disconnect by user');
  }

  public async logout(): Promise<void> {
    if (this.socket) {
      try {
        await this.socket.logout();
      } catch (e) {
        logger.warn({ e }, 'Error during socket logout');
      }
    }
    await this.disconnect();
    await this.clearAuthState();
  }

  private async clearAuthState(): Promise<void> {
    try {
      if (fs.existsSync(config.BAILEYS_AUTH_DIR)) {
        const files = fs.readdirSync(config.BAILEYS_AUTH_DIR);
        for (const file of files) {
          fs.unlinkSync(path.join(config.BAILEYS_AUTH_DIR, file));
        }
      }
      logger.info('Cleared WhatsApp authentication state from disk');
    } catch (err) {
      logger.error({ err }, 'Failed to clear auth directory');
    }
  }
}

export const whatsappConnection = new WhatsAppConnectionManager();
