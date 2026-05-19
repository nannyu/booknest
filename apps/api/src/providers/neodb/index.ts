/**
 * NeoDB Provider。
 *
 * 默认关闭。强项是中文 description（简介）+ 中文出版社/译者元数据。
 *
 * 接口（公开，无需 OAuth）：
 *   GET /api/catalog/search?query={q}&category=book&page={n}
 *
 * env：
 *   NEODB_INSTANCE_URL  默认 https://neodb.social；可换其他 NeoDB 实例
 *   NEODB_API_TOKEN     可选；填了走 polite pool（更高 rate limit）
 *
 * NeoDB 实例可能因网络位置不同有不同的可达性——失败由上层 circuit breaker 隔离。
 */

import type {
  BookCandidate,
  BookProvider,
  ProviderFetchResult,
  SearchAuthorParams,
  SearchTitleParams,
} from '@booknest/shared';
import { env } from '../../config/env.js';
import { fetchJson } from '../../lib/http.js';
import { mapNeoDBEditionToCandidate } from './mapper.js';
import type { NeoDBSearchResult } from './types.js';

function buildHeaders(): Record<string, string> {
  if (!env.NEODB_API_TOKEN) return {};
  return { Authorization: `Bearer ${env.NEODB_API_TOKEN}` };
}

function buildSearchUrl(query: string, limit: number): string {
  const base = env.NEODB_INSTANCE_URL.replace(/\/$/, '');
  const params = new URLSearchParams({
    query,
    category: 'book',
    page: '1',
  });
  // NeoDB 一页 20 条，limit 仅供客户端裁剪
  const url = `${base}/api/catalog/search?${params.toString()}`;
  void limit;
  return url;
}

export class NeoDBProvider implements BookProvider {
  readonly name = 'neodb';

  async searchByISBN(isbn: string, signal?: AbortSignal): Promise<ProviderFetchResult> {
    const url = buildSearchUrl(isbn, 5);
    const data = await fetchJson<NeoDBSearchResult>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
      headers: buildHeaders(),
    });
    return { candidates: mapItems(data), snapshot: data };
  }

  async searchByTitle(params: SearchTitleParams, signal?: AbortSignal): Promise<ProviderFetchResult> {
    const q = params.author ? `${params.title} ${params.author}` : params.title;
    const url = buildSearchUrl(q, params.limit ?? 10);
    const data = await fetchJson<NeoDBSearchResult>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
      headers: buildHeaders(),
    });
    return { candidates: mapItems(data).slice(0, params.limit ?? 10), snapshot: data };
  }

  async searchByAuthor(params: SearchAuthorParams, signal?: AbortSignal): Promise<ProviderFetchResult> {
    const url = buildSearchUrl(params.author, params.limit ?? 20);
    const data = await fetchJson<NeoDBSearchResult>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
      headers: buildHeaders(),
    });
    return { candidates: mapItems(data).slice(0, params.limit ?? 20), snapshot: data };
  }
}

function mapItems(data: NeoDBSearchResult): BookCandidate[] {
  if (!data.data) return [];
  return data.data
    .filter((x) => x.category === 'book' || x.type?.toLowerCase().includes('edition'))
    .map(mapNeoDBEditionToCandidate)
    .filter((c): c is BookCandidate => c !== null);
}
