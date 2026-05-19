/**
 * Google Books Provider。
 * 默认启用，rate limit 60/min，cache 30 天。
 *
 * 接口：
 *   GET https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}
 *   GET https://www.googleapis.com/books/v1/volumes?q={query}&maxResults=...
 *
 * 可选 key：GOOGLE_BOOKS_API_KEY。无 key 走匿名配额（约 1000/day）。
 */

import type { BookCandidate, BookProvider, SearchAuthorParams, SearchTitleParams } from '@booknest/shared';
import { env } from '../../config/env.js';
import { fetchJson } from '../../lib/http.js';
import { mapGBVolumeToCandidate } from './mapper.js';
import type { GBVolumesResponse } from './types.js';

const BASE = 'https://www.googleapis.com/books/v1/volumes';

function buildUrl(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === '') continue;
    params.set(k, String(v));
  }
  if (env.GOOGLE_BOOKS_API_KEY) params.set('key', env.GOOGLE_BOOKS_API_KEY);
  return `${BASE}?${params.toString()}`;
}

export class GoogleBooksProvider implements BookProvider {
  readonly name = 'google_books';

  async searchByISBN(isbn: string, signal?: AbortSignal): Promise<BookCandidate[]> {
    const url = buildUrl({ q: `isbn:${isbn}`, maxResults: 5 });
    const data = await fetchJson<GBVolumesResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    return mapItems(data);
  }

  async searchByTitle(params: SearchTitleParams, signal?: AbortSignal): Promise<BookCandidate[]> {
    const qParts = [`intitle:"${params.title}"`];
    if (params.author) qParts.push(`inauthor:"${params.author}"`);
    const url = buildUrl({
      q: qParts.join(' '),
      maxResults: Math.min(params.limit ?? 10, 40),
      ...(params.language ? { langRestrict: shortLang(params.language) } : {}),
    });
    const data = await fetchJson<GBVolumesResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    return mapItems(data);
  }

  async searchByAuthor(params: SearchAuthorParams, signal?: AbortSignal): Promise<BookCandidate[]> {
    const url = buildUrl({
      q: `inauthor:"${params.author}"`,
      maxResults: Math.min(params.limit ?? 20, 40),
      ...(params.language ? { langRestrict: shortLang(params.language) } : {}),
    });
    const data = await fetchJson<GBVolumesResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    return mapItems(data);
  }
}

function mapItems(data: GBVolumesResponse): BookCandidate[] {
  if (!data.items) return [];
  return data.items.map(mapGBVolumeToCandidate).filter((c): c is BookCandidate => c !== null);
}

function shortLang(s: string): string {
  return s.toLowerCase().split('-')[0]!;
}
