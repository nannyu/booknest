/**
 * Google Books Volume → BookCandidate。
 *
 * 关键点：
 * - industryIdentifiers 是 [{type, identifier}] 数组，要遍历分拣
 * - language 是 "zh-CN" / "en-US"，截短到 ISO 639-1
 * - imageLinks 优先大尺寸；https 强制
 */

import type { BookCandidate, ExternalIdentifier } from '@booknest/shared';
import { detectISBNFormat, normalizeISBN } from '@booknest/shared';
import type { GBVolume } from './types.js';

function splitIdentifiers(
  arr: NonNullable<GBVolume['volumeInfo']>['industryIdentifiers'] | undefined,
): { isbn10?: string; isbn13?: string; others: ExternalIdentifier[] } {
  const result: { isbn10?: string; isbn13?: string; others: ExternalIdentifier[] } = {
    others: [],
  };
  if (!arr) return result;
  for (const x of arr) {
    if (x.type === 'ISBN_13') {
      const norm = normalizeISBN(x.identifier);
      if (detectISBNFormat(norm) === 'isbn13') result.isbn13 ??= norm;
    } else if (x.type === 'ISBN_10') {
      const norm = normalizeISBN(x.identifier);
      if (detectISBNFormat(norm) === 'isbn10') result.isbn10 ??= norm;
    } else if (x.type === 'OTHER') {
      result.others.push({ type: 'other', value: x.identifier, source: 'google_books' });
    } else if (x.type === 'ISSN') {
      // ISSN 是期刊/连续出版物标识符，非图书，跳过
      continue;
    }
  }
  return result;
}

function shortenLanguage(lang: string | undefined): string | undefined {
  if (!lang) return undefined;
  return lang.toLowerCase().split('-')[0];
}

function bestCover(info: NonNullable<GBVolume['volumeInfo']>): string | undefined {
  const il = info.imageLinks;
  if (!il) return undefined;
  const candidate =
    il.extraLarge ?? il.large ?? il.medium ?? il.small ?? il.thumbnail ?? il.smallThumbnail;
  if (!candidate) return undefined;
  return candidate.replace(/^http:\/\//, 'https://');
}

export function mapGBVolumeToCandidate(volume: GBVolume): BookCandidate | null {
  const info = volume.volumeInfo;
  if (!info || !info.title) return null;
  const ids = splitIdentifiers(info.industryIdentifiers);
  return {
    title: info.title,
    subtitle: info.subtitle,
    authors: info.authors ?? [],
    publisher: info.publisher,
    publishedDate: info.publishedDate,
    isbn10: ids.isbn10,
    isbn13: ids.isbn13,
    language: shortenLanguage(info.language),
    pageCount: info.pageCount,
    description: info.description,
    coverUrl: bestCover(info),
    categories: info.categories,
    identifiers: ids.others,
    source: 'google_books',
    externalId: volume.id,
    externalUrl: info.canonicalVolumeLink ?? info.infoLink,
    raw: volume,
  };
}
