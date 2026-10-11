import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default('postgresql://whatsapp_user:secret@localhost:5432/vivegaa_whatsapp?schema=public'),
  SESSION_SECRET: z.string().min(16, 'SESSION_SECRET must be at least 16 chars').default('vivegaa_session_secret_default_32chars'),
  ENCRYPTION_KEY: z.string().min(16, 'ENCRYPTION_KEY must be at least 16 chars').default('vivegaa_encryption_key_default_32'),
  INTERNAL_API_KEY: z.string().min(8).default('vw_live_internal_secret_key_2026'),
  BAILEYS_AUTH_DIR: z.string().default(path.resolve(process.cwd(), 'auth')),
  MEDIA_STORAGE_DIR: z.string().default(path.resolve(process.cwd(), 'media')),
  PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  DEFAULT_COUNTRY_CODE: z.string().default('91'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  MESSAGE_QUEUE_ENABLED: z.coerce.boolean().default(true),
  MAX_MESSAGES_PER_MINUTE: z.coerce.number().default(20),
  QUEUE_WORKER_CONCURRENCY: z.coerce.number().default(2),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
