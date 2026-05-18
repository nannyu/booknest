/**
 * Crossref Work → BookCandidate。
 *
 * Crossref 主要收录学术论文、专著章节、会议论文。
 * 对大众图书（小说、散文）覆盖较差，但对学术书/教材很有价值。
 */

import type { BookCandidate } from '@booknest/shared';
import { detectISBNFormat, normalizeISBN } from '@booknest/shared';
import type { CrossrefWork } from './types.js';

function extractYear(work: CrossrefWork): string | undefined {
  const dp = work['published-print'] ?? work['published-online'] ?? work.published;
  if (dp?.['date-parts']?.[0]?.[0]) {
    return String(dp['date-parts'][0][0]);
  }
  return undefined;
}

function pickIsbn(isbns: string[] | undefined): { isbn10?: string; isbn13?: string } {
  const result: { isbn10?: string; isbn13?: string } = {};
  if (!isbns) return result;
  for (const raw of isbns) {
    const norm = normalizeISBN(raw);
    const fmt = detectISBNFormat(norm);
    if (fmt === 'isbn13' && !result.isbn13) result.isbn13 = norm;
    if (fmt === 'isbn10' && !result.isbn10) result.isbn10 = norm;
  }
  return result;
}

function buildAuthors(work: CrossrefWork): string[] {
  if (!work.author) return [];
  return work.author
    .map((a) => {
      if (a.name) return a.name;
      const parts = [a.given, a.family].filter(Boolean);
      return parts.join(' ');
    })
    .filter(Boolean);
}

export function mapCrossrefWorkToCandidate(work: CrossrefWork): BookCandidate | null {
  const title = work.title?.[0];
  if (!title) return null;
  const ids = pickIsbn(work.ISBN);
  return {
    title,
    authors: buildAuthors(work),
    publisher: work.publisher,
    publishedDate: extractYear(work),
    isbn10: ids.isbn10,
    isbn13: ids.isbn13,
    language: work.language,
    pageCount: work.page ? Number(work.page) : undefined,
    description: work['container-title']?.[0],
    source: 'crossref',
    externalId: work.DOI,
    externalUrl: work.URL,
    raw: work,
  };
}
