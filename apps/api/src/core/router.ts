/**
 * 顶层查询编排。
 *
 * 流程（设计文档 §6）：
 *   parse query
 *     → 对每个 enabled provider:
 *         1. 查 cache（命中即返回）
 *         2. circuit breaker 检查
 *         3. rate limit 检查
 *         4. 真实调用（带 per-provider timeout）
 *         5. 成功：写 snapshot + cache + 记录健康；失败：短 TTL 缓存空结果 + 记录健康
 *     → 收齐结果（Promise.allSettled，源之间互不影响）
 *     → 合并（按 ISBN/title 分组 + FIELD_PRIORITY）
 *     → 评分（§11.2）
 *     → 按 §11.3 决定 recommended / needsReview
 */

import { nanoid } from 'nanoid';
import type {
  BookCandidate,
  BookProvider,
  ProviderConfig,
  RankedBook,
  SearchQuery,
} from '@booknest/shared';
import { BookNestError } from '@booknest/shared';
import { env } from '../config/env.js';
import { getEnabledProviders } from '../config/providers.js';
import { getDb } from '../db/client.js';
import { sourceSnapshots } from '../db/schema.js';
import { buildCacheKey, readCache, writeCache } from './cache.js';
import { canCall, recordFailure, recordSuccess } from './circuit-breaker.js';
import { mergeCandidates, type MergedCandidate } from './merge.js';
import { persistMergedCandidate } from './persist.js';
import { ensureConfigured, tryAcquire } from './rate-limit.js';
import { scoreCandidate } from './score.js';

const GLOBAL_TIMEOUT_MS = 12_000;

export interface SearchResult {
  query: SearchQuery;
  results: RankedBook[];
}

export async function searchBooks(query: SearchQuery): Promise<SearchResult> {
  validateQuery(query);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error('global-timeout')), GLOBAL_TIMEOUT_MS);
  try {
    const enabled = getEnabledProviders().filter((p) => {
      if (query.queryType === 'isbn') return p.config.supportsISBN;
      if (query.queryType === 'author') return p.config.supportsAuthorSearch === true;
      return p.config.supportsTitleSearch;
    });

    const settled = await Promise.allSettled(
      enabled.map((e) => fetchFromProvider(e.config, e.provider, query, ctrl.signal)),
    );

    const all: BookCandidate[] = [];
    for (const r of settled) {
      if (r.status === 'fulfilled') all.push(...r.value);
    }

    const merged = mergeCandidates(all);
    const scored = merged
      .map((m) => ({ m, s: scoreCandidate(m, query) }))
      .sort((a, b) => b.s - a.s);

    // 落库：每个候选 upsert 到 editions（连同 contributors / external_identifiers）。
    // 失败不影响搜索响应，回退到 nanoid 作 id（前端刷新会拉不到，但当前 session 可用）。
    const ranked = scored.map(({ m, s }) => {
      let id: string;
      try {
        id = persistMergedCandidate(m, s);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[persist] failed:', (err as Error).message);
        id = nanoid();
      }
      return toRanked(m, s, id);
    });
    applyReturnPolicy(query, scored, ranked);

    const limit = query.limit ?? 20;
    return { query, results: ranked.slice(0, limit) };
  } finally {
    clearTimeout(timer);
  }
}

function validateQuery(query: SearchQuery): void {
  if (query.queryType === 'isbn' && !query.isbn) {
    throw new BookNestError('INVALID_QUERY', 'ISBN query requires isbn field', 400);
  }
  if (query.queryType === 'author' && !query.author) {
    throw new BookNestError('INVALID_QUERY', 'author query requires author field', 400);
  }
  if (
    (query.queryType === 'title' || query.queryType === 'title_author') &&
    !query.title
  ) {
    throw new BookNestError('INVALID_QUERY', 'title query requires title field', 400);
  }
}

async function fetchFromProvider(
  config: ProviderConfig,
  provider: BookProvider,
  query: SearchQuery,
  outerSignal: AbortSignal,
): Promise<BookCandidate[]> {
  const cacheKey = buildCacheKey({
    provider: config.name,
    queryType: query.queryType,
    query: cacheQueryString(query),
    language: query.language,
  });

  const cached = readCache<BookCandidate[]>(cacheKey);
  if (cached !== null) return cached;

  if (!canCall(config.name)) return [];
  ensureConfigured(config.name, config.rateLimitPerMinute);
  if (!tryAcquire(config.name)) return [];

  const ctrl = new AbortController();
  const timer = setTimeout(
    () => ctrl.abort(new Error('provider-timeout')),
    config.timeoutMs,
  );
  const onOuter = () => ctrl.abort();
  outerSignal.addEventListener('abort', onOuter, { once: true });

  try {
    const cands = await callProvider(provider, query, ctrl.signal);
    recordSuccess(config.name);
    recordSnapshot({
      source: config.name,
      queryType: query.queryType,
      query: cacheQueryString(query),
      data: cands,
    });
    writeCache(cacheKey, cands, config.cacheTtlDays, {
      query: cacheQueryString(query),
      queryType: query.queryType,
    });
    return cands;
  } catch (e) {
    const msg = (e as Error).message;
    recordFailure(config.name, msg);
    writeCache(cacheKey, [] as BookCandidate[], env.FAILURE_CACHE_TTL_DAYS, {
      query: cacheQueryString(query),
      queryType: query.queryType,
    });
    return [];
  } finally {
    clearTimeout(timer);
    outerSignal.removeEventListener('abort', onOuter);
  }
}

async function callProvider(
  provider: BookProvider,
  query: SearchQuery,
  signal: AbortSignal,
): Promise<BookCandidate[]> {
  if (query.queryType === 'isbn' && query.isbn) {
    return provider.searchByISBN(query.isbn, signal);
  }
  if (query.queryType === 'author' && query.author && provider.searchByAuthor) {
    return provider.searchByAuthor(
      {
        author: query.author,
        limit: query.limit ?? 20,
        language: query.language,
      },
      signal,
    );
  }
  if (!query.title) return [];
  return provider.searchByTitle(
    {
      title: query.title,
      author: query.author,
      limit: query.limit ?? 10,
      language: query.language,
    },
    signal,
  );
}

function cacheQueryString(query: SearchQuery): string {
  if (query.queryType === 'isbn') return query.isbn ?? query.raw;
  if (query.queryType === 'author') return `author:${query.author ?? query.raw}`;
  if (query.queryType === 'title_author') {
    return [query.title, query.author].filter(Boolean).join('|');
  }
  return query.title ?? query.raw;
}

function recordSnapshot(input: {
  source: string;
  queryType: string;
  query: string;
  data: BookCandidate[];
}): void {
  if (input.data.length === 0) return;
  try {
    const db = getDb();
    db.insert(sourceSnapshots)
      .values({
        id: nanoid(),
        source: input.source,
        query: input.query,
        queryType: input.queryType,
        responseJson: input.data as unknown as object,
      })
      .run();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[snapshot] failed:', (err as Error).message);
  }
}

function toRanked(merged: MergedCandidate, score: number, id: string): RankedBook {
  return {
    id,
    title: merged.title,
    subtitle: merged.subtitle,
    authors: merged.authors.map((name) => ({ name, role: 'author' as const })),
    publisher: merged.publisher,
    publishedDate: merged.publishedDate,
    isbn10: merged.isbn10,
    isbn13: merged.isbn13,
    language: merged.language,
    pageCount: merged.pageCount,
    coverUrl: merged.coverUrl,
    description: merged.description,
    categories: merged.categories,
    confidence: score,
    recommended: false,
    needsReview: false,
    sources: merged.sources.map((name) => ({ name })),
  };
}

function applyReturnPolicy(
  query: SearchQuery,
  scored: Array<{ m: MergedCandidate; s: number }>,
  ranked: RankedBook[],
): void {
  const top = scored[0];
  if (!top) return;
  const second = scored[1];
  const isISBN = query.queryType === 'isbn';

  if (isISBN && top.s > 90) {
    ranked[0]!.recommended = true;
  } else if (!isISBN && (second === undefined || top.s - second.s > 20)) {
    ranked[0]!.recommended = true;
  }
  if (isISBN && top.s < 70) {
    ranked[0]!.needsReview = true;
  }
}
