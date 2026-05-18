/**
 * 环境变量解析。zod 校验，启动失败立刻报错。
 * 所有外部访问代码只能从这里读 env，禁止散落的 process.env。
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// 显式指定 .env 路径，避免依赖 CWD（pnpm dev 在 apps/api 启动时 CWD 是 apps/api）
dotenvConfig({
  path: join(dirname(fileURLToPath(import.meta.url)), '../../../../.env'),
});

const boolFromString = z
  .union([z.string().min(1), z.boolean()])
  .transform((v) => (typeof v === 'boolean' ? v : ['true', '1', 'yes'].includes(v.toLowerCase())));

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  // Database
  DATABASE_URL: z.string().min(1).default('file:./data/booknest.db'),

  // Providers
  ENABLE_OPEN_LIBRARY: boolFromString.default('true'),
  ENABLE_GOOGLE_BOOKS: boolFromString.default('true'),
  ENABLE_CROSSREF: boolFromString.default('false'),
  ENABLE_LOC: boolFromString.default('false'),
  ENABLE_NLC_OPAC: boolFromString.default('false'),
  ENABLE_CALIS: boolFromString.default('false'),
  ENABLE_PDC: boolFromString.default('false'),
  ENABLE_COMMERCIAL_ISBN: boolFromString.default('false'),

  // Google Books
  GOOGLE_BOOKS_API_KEY: z.string().optional(),

  // Commercial ISBN (ISBNdb / API Ninjas / 自定义 endpoint)
  COMMERCIAL_ISBN_PRESET: z.enum(['isbndb', 'api_ninjas']).default('isbndb'),
  COMMERCIAL_ISBN_API_KEY: z.string().optional(),
  COMMERCIAL_ISBN_API_URL: z.string().url().optional(),

  // App identity (polite usage)
  APP_USER_AGENT: z
    .string()
    .min(1)
    .default('BookNest/0.1 (+https://github.com/booknest/booknest)'),
  APP_CONTACT_EMAIL: z.string().email().optional(),

  // Cache TTL
  FAILURE_CACHE_TTL_DAYS: z.coerce.number().int().positive().default(1),

  // Storage
  COVER_STORAGE_DRIVER: z.enum(['remote', 'local', 's3']).default('remote'),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
