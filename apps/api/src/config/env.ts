import { existsSync } from 'node:fs';
import { z } from 'zod';

// Load .env (Node >= 21.7) when present. Tests set their own values.
if (process.env['NODE_ENV'] !== 'test' && existsSync('.env')) {
  process.loadEnvFile('.env');
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGO_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/smart-erp'),
  CLIENT_URL: z.string().url().default('http://localhost:4200'),
  /** Optional comma separated DNS servers, e.g. "8.8.8.8,1.1.1.1". Fixes `querySrv ECONNREFUSED` with mongodb+srv on some networks. */
  DNS_SERVERS: z
    .string()
    .optional()
    .transform((v) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [])),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  /** Access token lifetime in seconds (default 15 minutes). */
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  /** Refresh token lifetime in days. */
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  /** Number of proxies in front of the API (Render = 1; Vercel → Render = 2). Used for req.ip / rate limiting. */
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
