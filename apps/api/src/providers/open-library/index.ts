/**
 * Open Library Provider。
 * 默认启用，rate limit 60/min，cache 90 天。
 *
 * 接口：
 *   GET https://openlibrary.org/search.json?q=isbn:{isbn}
 *   GET https://openlibrary.org/search.json?q={query}&limit={n}
 */

import type { BookCandidate, BookProvider, SearchAuthorParams, SearchTitleParams } from '@booknest/shared';
import { detectISBNFormat } from '@booknest/shared';
import { fetchJson } from '../../lib/http.js';
import { mapOLDocToCandidate } from './mapper.js';
import type { OLSearchResponse } from './types.js';

const BASE = 'https://openlibrary.org/search.json';
const FIELDS = [
  'key',
  'title',
  'subtitle',
  'author_name',
  'author_key',
  'publisher',
  'publish_date',
  'publish_year',
  'first_publish_year',
  'isbn',
  'language',
  'cover_i',
  'cover_edition_key',
  'edition_key',
  'number_of_pages_median',
  'first_sentence',
  'subject',
].join(',');

function buildUrl(query: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    params.set(k, String(v));
  }
  return `${BASE}?${params.toString()}`;
}

export class OpenLibraryProvider implements BookProvider {
  readonly name = 'open_library';

  async searchByISBN(isbn: string, signal?: AbortSignal): Promise<BookCandidate[]> {
    const url = buildUrl({
      q: `isbn:${isbn}`,
      fields: FIELDS,
      limit: 5,
    });
    const data = await fetchJson<OLSearchResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    const candidates = mapDocs(data);
    // OL search 返回的是 work-merged 数据。把查询用的 ISBN 写回，
    // 让上层合并/评分能正确按 ISBN 命中
    const format = detectISBNFormat(isbn);
    for (const c of candidates) {
      if (format === 'isbn13') c.isbn13 = isbn;
      else if (format === 'isbn10') c.isbn10 = isbn;
    }
    return candidates;
  }

  async searchByTitle(params: SearchTitleParams, signal?: AbortSignal): Promise<BookCandidate[]> {
    let q = params.author ? `${params.title} ${params.author}` : params.title;
    // OL search.json 对 < 3 字符的查询返回 422；加 title: 前缀可规避
    if (Array.from(q).length < 3) {
      q = `title:${q}`;
    }
    const url = buildUrl({
      q,
      fields: FIELDS,
      limit: params.limit ?? 10,
      ...(params.language ? { language: olLangCode(params.language) } : {}),
    });
    const data = await fetchJson<OLSearchResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    return mapDocs(data);
  }

  async searchByAuthor(params: SearchAuthorParams, signal?: AbortSignal): Promise<BookCandidate[]> {
    // 用 author 字段而不是 q=author:...，OL 对 author 字段做模糊匹配
    const url = buildUrl({
      author: params.author,
      fields: FIELDS,
      limit: params.limit ?? 20,
      ...(params.language ? { language: olLangCode(params.language) } : {}),
    });
    const data = await fetchJson<OLSearchResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    return mapDocs(data);
  }
}

function mapDocs(data: OLSearchResponse): BookCandidate[] {
  if (!data.docs) return [];
  return data.docs.map(mapOLDocToCandidate).filter((c): c is BookCandidate => c !== null);
}

function olLangCode(iso6391: string): string | undefined {
  // ISO 639-1 → OL 使用的 639-2/B
  const map: Record<string, string> = {
    zh: 'chi',
    en: 'eng',
    ja: 'jpn',
    ko: 'kor',
    fr: 'fre',
    de: 'ger',
    ru: 'rus',
    es: 'spa',
    it: 'ita',
  };
  return map[iso6391.toLowerCase()];
}
