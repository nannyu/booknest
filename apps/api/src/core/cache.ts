/**
 * 搜索结果缓存（search_cache 表）。
 *
 * - key = sha256(provider:queryType:query:language)
 * - value = JSON 化的 BookCandidate[]
 * - 失败结果也缓存（短 TTL），避免反复打挂掉的源
 * - 读取时跳过过期 row
 */

import { createHash } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { getDb } from '../db/client.js';
import { searchCache } from '../db/schema.js';

export interface CacheKeyInput {
  provider: string;
  queryType: string;
  query: string;
  language?: string;
}

export function buildCacheKey(input: CacheKeyInput): string {
  const canonical = `${input.provider}:${input.queryType}:${input.query}:${input.language ?? ''}`;
  return createHash('sha256').update(canonical).digest('hex');
}

export function readCache<T>(key: string): T | null {
  const db = getDb();
  const now = new Date().toISOString();
  const row = db
    .select()
    .from(searchCache)
    .where(and(eq(searchCache.cacheKey, key), gt(searchCache.expiresAt, now)))
    .get();
  if (!row) return null;
  return row.resultJson as T;
}

export function writeCache<T>(
  key: string,
  value: T,
  ttlDays: number,
  meta: { query: string; queryType: string },
): void {
  const db = getDb();
  const expiresAt = new Date(Date.now() + ttlDays * 86400000).toISOString();
  db.insert(searchCache)
    .values({
      cacheKey: key,
      query: meta.query,
      queryType: meta.queryType,
      resultJson: value as unknown as object,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: searchCache.cacheKey,
      set: {
        resultJson: value as unknown as object,
        expiresAt,
      },
    })
    .run();
}
