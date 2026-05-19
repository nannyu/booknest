/**
 * NeoDB Edition → BookCandidate。
 *
 * NeoDB 的强项：中文 description（豆瓣等众包数据回流）+ 中文 publisher 列表。
 * 我们主要用它补 OL/GB 在中文书上的简介短板。
 */

import type { BookCandidate } from '@booknest/shared';
import { detectISBNFormat, normalizeISBN } from '@booknest/shared';
import type { NeoDBEdition } from './types.js';

function pickIsbns(raw: string | null | undefined): {
  isbn10?: string;
  isbn13?: string;
} {
  if (!raw) return {};
  const norm = normalizeISBN(raw);
  const fmt = detectISBNFormat(norm);
  if (fmt === 'isbn13') return { isbn13: norm };
  if (fmt === 'isbn10') return { isbn10: norm };
  return {};
}

function shortenLanguage(langs: string[] | undefined): string | undefined {
  const first = langs?.[0];
  if (!first) return undefined;
  return first.toLowerCase().split(/[-_]/)[0];
}

function pubYearToString(year: number | null | undefined, month: number | null | undefined): string | undefined {
  if (!year) return undefined;
  return month ? `${year}-${String(month).padStart(2, '0')}` : String(year);
}

function pickHttpsCover(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return url.replace(/^http:\/\//, 'https://');
}

function pickPageCount(p: number | string | null | undefined): number | undefined {
  if (typeof p === 'number') return p;
  if (typeof p === 'string') {
    const n = parseInt(p, 10);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
}

export function mapNeoDBEditionToCandidate(ed: NeoDBEdition): BookCandidate | null {
  if (!ed.title) return null;
  const ids = pickIsbns(ed.isbn);
  return {
    title: ed.title,
    subtitle: ed.subtitle ?? undefined,
    authors: ed.author ?? [],
    translators: ed.translator,
    publisher: ed.publisher?.[0],
    publishedDate: pubYearToString(ed.pub_year, ed.pub_month),
    isbn10: ids.isbn10,
    isbn13: ids.isbn13,
    language: shortenLanguage(ed.language),
    pageCount: pickPageCount(ed.pages),
    description: ed.description || ed.brief,
    coverUrl: pickHttpsCover(ed.cover_image_url),
    categories: ed.tags ?? undefined,
    source: 'neodb',
    externalId: ed.uuid,
    externalUrl: ed.url ?? ed.api_url,
    raw: ed,
  };
}
