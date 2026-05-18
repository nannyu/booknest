/**
 * Open Library Doc → BookCandidate。
 *
 * 关键点：
 * - ISBN 数组要拆成 isbn10 / isbn13
 * - 语言代码 ISO 639-2 (zho/eng) → ISO 639-1 (zh/en)
 * - 出版日期取第一个；优先 first_publish_year
 * - 封面用 cover_i 拼 Covers API
 */

import type { BookCandidate } from '@booknest/shared';
import { detectISBNFormat, normalizeISBN } from '@booknest/shared';
import type { OLSearchDoc } from './types.js';

const LANG_ISO_639_2_TO_1: Record<string, string> = {
  zho: 'zh',
  chi: 'zh',
  eng: 'en',
  jpn: 'ja',
  kor: 'ko',
  fre: 'fr',
  fra: 'fr',
  ger: 'de',
  deu: 'de',
  rus: 'ru',
  spa: 'es',
  ita: 'it',
};

function pickIsbns(arr: string[] | undefined): { isbn10?: string; isbn13?: string } {
  if (!arr || arr.length === 0) return {};
  let isbn10: string | undefined;
  let isbn13: string | undefined;
  for (const raw of arr) {
    const norm = normalizeISBN(raw);
    const fmt = detectISBNFormat(norm);
    if (fmt === 'isbn13' && !isbn13) isbn13 = norm;
    if (fmt === 'isbn10' && !isbn10) isbn10 = norm;
    if (isbn10 && isbn13) break;
  }
  return { isbn10, isbn13 };
}

function pickLanguage(arr: string[] | undefined): string | undefined {
  if (!arr || arr.length === 0) return undefined;
  const first = arr[0]!.toLowerCase();
  return LANG_ISO_639_2_TO_1[first] ?? first;
}

function buildCoverUrl(doc: OLSearchDoc, isbn13?: string, isbn10?: string): string | undefined {
  if (doc.cover_i) {
    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
  }
  if (isbn13) return `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg`;
  if (isbn10) return `https://covers.openlibrary.org/b/isbn/${isbn10}-L.jpg`;
  return undefined;
}

function pickPublishedDate(doc: OLSearchDoc): string | undefined {
  if (doc.publish_date && doc.publish_date.length > 0) return doc.publish_date[0];
  if (doc.first_publish_year) return String(doc.first_publish_year);
  return undefined;
}

export function mapOLDocToCandidate(doc: OLSearchDoc): BookCandidate | null {
  if (!doc.title) return null;
  const { isbn10, isbn13 } = pickIsbns(doc.isbn);
  const candidate: BookCandidate = {
    title: doc.title,
    subtitle: doc.subtitle,
    authors: doc.author_name ?? [],
    publisher: doc.publisher?.[0],
    publishedDate: pickPublishedDate(doc),
    isbn10,
    isbn13,
    language: pickLanguage(doc.language),
    pageCount: doc.number_of_pages_median,
    description: doc.first_sentence?.[0],
    coverUrl: buildCoverUrl(doc, isbn13, isbn10),
    categories: doc.subject?.slice(0, 8),
    source: 'open_library',
    externalId: doc.key,
    externalUrl: `https://openlibrary.org${doc.key}`,
    raw: doc,
  };
  return candidate;
}
