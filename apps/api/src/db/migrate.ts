/**
 * Drizzle 迁移 runner。CLI 入口：`pnpm db:migrate`。
 */

import { join } from 'node:path';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { closeDb, getDb } from './client.js';

// 用绝对路径，避免依赖 CWD（pnpm db:migrate 在 root 或 apps/api 跑都要 work）
const migrationsFolder = join(import.meta.dirname, 'migrations');

function main() {
  const db = getDb();
  // eslint-disable-next-line no-console
  console.log('Running migrations...');
  migrate(db, { migrationsFolder });
  // eslint-disable-next-line no-console
  console.log('Migrations applied.');
  closeDb();
}

main();
