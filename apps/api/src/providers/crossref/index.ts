/**
 * Crossref Provider。
 * 默认关闭，rate limit  polite pool（建议带 mailto）。
 *
 * 接口：
 *   GET https://api.crossref.org/works?filter=isbn:{isbn}
 *   GET https://api.crossref.org/works?query.title={title}&rows={n}
 *
 * 特点：
 * - 主要收录学术专著、教材、会议论文
 * - 对大众小说/散文覆盖差
 * - 无需 API key，但 polite pool 要求在 UA 里带 mailto
 */

import type { BookCandidate, BookProvider, SearchAuthorParams, SearchTitleParams } from '@booknest/shared';
import { fetchJson } from '../../lib/http.js';
import { mapCrossrefWorkToCandidate } from './mapper.js';
import type { CrossrefWorksResponse } from './types.js';

const BASE = 'https://api.crossref.org/works';

export class CrossrefProvider implements BookProvider {
  readonly name = 'crossref';

  async searchByISBN(isbn: string, signal?: AbortSignal): Promise<BookCandidate[]> {
    const url = `${BASE}?filter=isbn:${encodeURIComponent(isbn)}&rows=5`;
    const data = await fetchJson<CrossrefWorksResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    return mapItems(data);
  }

  async searchByTitle(params: SearchTitleParams, signal?: AbortSignal): Promise<BookCandidate[]> {
    const q = params.author ? `${params.title} ${params.author}` : params.title;
    const url = `${BASE}?query.title=${encodeURIComponent(q)}&rows=${Math.min(params.limit ?? 10, 20)}`;
    const data = await fetchJson<CrossrefWorksResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    return mapItems(data);
  }

  async searchByAuthor(params: SearchAuthorParams, signal?: AbortSignal): Promise<BookCandidate[]> {
    const url = `${BASE}?query.author=${encodeURIComponent(params.author)}&rows=${Math.min(params.limit ?? 20, 20)}`;
    const data = await fetchJson<CrossrefWorksResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    return mapItems(data);
  }
}

function mapItems(data: CrossrefWorksResponse): BookCandidate[] {
  const items = data.message?.items;
  if (!items || items.length === 0) return [];
  return items.map(mapCrossrefWorkToCandidate).filter((c): c is BookCandidate => c !== null);
}
