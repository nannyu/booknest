/**
 * better-sqlite3 客户端 + Drizzle 包装。
 *
 * - WAL 模式：读写并发友好
 * - foreign_keys = ON：保证外键约束
 * - busy_timeout：避免短暂锁冲突直接报错
 */

import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { env } from '../config/env.js';
import * as schema from './schema.js';

let _db: BetterSQLite3Database<typeof schema> | null = null;
let _sqlite: Database.Database | null = null;

function resolveDbPath(url: string): string {
  return url.startsWith('file:') ? url.slice('file:'.length) : url;
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;

  const path = resolveDbPath(env.DATABASE_URL);
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true });
  }

  _sqlite = new Database(path);
  _sqlite.pragma('journal_mode = WAL');
  _sqlite.pragma('foreign_keys = ON');
  _sqlite.pragma('busy_timeout = 5000');

  _db = drizzle(_sqlite, { schema });
  return _db;
}

export function getRawSqlite(): Database.Database {
  if (!_sqlite) getDb();
  return _sqlite!;
}

export function closeDb(): void {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
    _db = null;
  }
}

export type DB = BetterSQLite3Database<typeof schema>;
