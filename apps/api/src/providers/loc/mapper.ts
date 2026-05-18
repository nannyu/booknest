/**
 * LOC Result → BookCandidate。
 *
 * LOC 以英文馆藏为主，中文书覆盖很弱。
 * 但作为兜底源，对英文经典/公版书有价值。
 */

import type { BookCandidate } from '@booknest/shared';
import type { LOCResult } from './types.js';

function pickCover(imageUrls: string[] | undefined): string | undefined {
  if (!imageUrls || imageUrls.length === 0) return undefined;
  const first = imageUrls[0];
  if (!first) return undefined;
  return first.replace(/^http:\/\//, 'https://');
}

function pickDescription(result: LOCResult): string | undefined {
  if (result.description && result.description.length > 0) {
    return result.description[0];
  }
  if (result.item?.notes && result.item.notes.length > 0) {
    return result.item.notes[0];
  }
  return undefined;
}

export function mapLOCResultToCandidate(result: LOCResult): BookCandidate | null {
  const title = result.title ?? result.item?.title;
  if (!title) return null;

  const authors = result.contributor?.length
    ? result.contributor
    : (result.item?.contributors ?? []);

  return {
    title,
    authors: authors.filter((a) => typeof a === 'string' && a.length > 0),
    publisher: result.item?.created_published?.[0],
    publishedDate: result.date ?? (result.dates?.[0]),
    language: result.language,
    coverUrl: pickCover(result.image_url),
    description: pickDescription(result),
    source: 'loc',
    externalId: result.id,
    externalUrl: result.id,
    raw: result,
  };
}
