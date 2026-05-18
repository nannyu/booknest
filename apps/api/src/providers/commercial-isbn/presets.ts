/**
 * 商业 ISBN Provider 的 preset 定义。
 *
 * 一个 preset 提供：
 *   - URL 模板
 *   - 认证 header 名（不同服务商习惯不同）
 *   - 响应到 BookCandidate 的映射
 *
 * 接入新服务商：在此文件加一个 entry，types.ts 加响应类型即可。
 */

import type { BookCandidate } from '@booknest/shared';
import { detectISBNFormat, normalizeISBN } from '@booknest/shared';
import type { ApiNinjasResponse, CommercialPresetName, ISBNdbResponse } from './types.js';

export interface PresetConfig {
  /** 在描述里出现的服务名 */
  displayName: string;
  buildUrl(isbn: string): string;
  buildAuthHeader(apiKey: string): { name: string; value: string };
  mapResponse(data: unknown): BookCandidate[];
}

function pickIsbns(raw: { isbn?: string; isbn13?: string }): { isbn10?: string; isbn13?: string } {
  const out: { isbn10?: string; isbn13?: string } = {};
  for (const v of [raw.isbn, raw.isbn13]) {
    if (!v) continue;
    const norm = normalizeISBN(v);
    const fmt = detectISBNFormat(norm);
    if (fmt === 'isbn13' && !out.isbn13) out.isbn13 = norm;
    if (fmt === 'isbn10' && !out.isbn10) out.isbn10 = norm;
  }
  return out;
}

function pickHttpsCover(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:\/\//, 'https://');
}

const isbndb: PresetConfig = {
  displayName: 'ISBNdb',
  buildUrl: (isbn) => `https://api2.isbndb.com/book/${encodeURIComponent(isbn)}`,
  buildAuthHeader: (apiKey) => ({ name: 'Authorization', value: apiKey }),
  mapResponse: (data: unknown): BookCandidate[] => {
    const resp = data as ISBNdbResponse;
    const book = resp?.book;
    if (!book) return [];
    const title = book.title ?? book.title_long;
    if (!title) return [];
    const ids = pickIsbns({ isbn: book.isbn, isbn13: book.isbn13 });
    return [
      {
        title,
        subtitle: book.title_long && book.title_long !== book.title ? book.title_long : undefined,
        authors: book.authors ?? [],
        publisher: book.publisher,
        publishedDate: book.date_published,
        isbn10: ids.isbn10,
        isbn13: ids.isbn13,
        language: book.language,
        pageCount: book.pages,
        description: book.synopsis,
        coverUrl: pickHttpsCover(book.image),
        categories: book.subjects,
        source: 'commercial_isbn',
        externalId: ids.isbn13 ?? ids.isbn10,
        raw: resp,
      },
    ];
  },
};

const apiNinjas: PresetConfig = {
  displayName: 'API Ninjas',
  buildUrl: (isbn) =>
    `https://api.api-ninjas.com/v1/isbn?isbn=${encodeURIComponent(isbn)}`,
  buildAuthHeader: (apiKey) => ({ name: 'X-Api-Key', value: apiKey }),
  mapResponse: (data: unknown): BookCandidate[] => {
    const items = (data as ApiNinjasResponse) ?? [];
    return items
      .map((item): BookCandidate | null => {
        if (!item.title) return null;
        const authors = item.authors?.length ? item.authors : item.author ? [item.author] : [];
        const ids = pickIsbns({ isbn: item.isbn_10, isbn13: item.isbn_13 });
        return {
          title: item.title,
          authors,
          publisher: item.publisher,
          publishedDate: item.year ? String(item.year) : undefined,
          isbn10: ids.isbn10,
          isbn13: ids.isbn13,
          source: 'commercial_isbn',
          externalId: ids.isbn13 ?? ids.isbn10,
          raw: item,
        };
      })
      .filter((c): c is BookCandidate => c !== null);
  },
};

export const PRESETS: Record<CommercialPresetName, PresetConfig> = {
  isbndb,
  api_ninjas: apiNinjas,
};
