/**
 * Google Books mapper 测试。
 *
 * 没用 fixture（GB 匿名配额为 0/天，无法录制），改用内联代表样本。
 * 等拿到 GOOGLE_BOOKS_API_KEY 后再用 scripts/record-fixture.ts 补真实样本。
 */

import { describe, expect, it } from 'vitest';
import { mapGBVolumeToCandidate } from './mapper.js';
import type { GBVolume } from './types.js';

const fullVolume: GBVolume = {
  id: 'sample-id-1',
  selfLink: 'https://www.googleapis.com/books/v1/volumes/sample-id-1',
  volumeInfo: {
    title: 'The Three-Body Problem',
    subtitle: 'Book 1 of the Three-Body Trilogy',
    authors: ['Cixin Liu', 'Ken Liu'],
    publisher: 'Tor Books',
    publishedDate: '2014-11-11',
    description: 'A novel about first contact.',
    industryIdentifiers: [
      { type: 'ISBN_13', identifier: '9780765377067' },
      { type: 'ISBN_10', identifier: '0765377063' },
      { type: 'OTHER', identifier: 'GOOG:abc' },
    ],
    pageCount: 416,
    language: 'en-US',
    categories: ['Fiction / Science Fiction'],
    imageLinks: {
      smallThumbnail: 'http://example.com/small_t.jpg',
      thumbnail: 'http://example.com/t.jpg',
      small: 'http://example.com/s.jpg',
      medium: 'http://example.com/m.jpg',
      large: 'http://example.com/l.jpg',
      extraLarge: 'http://example.com/xl.jpg',
    },
    canonicalVolumeLink: 'https://books.google.com/books/about/abc',
    infoLink: 'https://books.google.com/books?id=abc',
  },
};

describe('mapGBVolumeToCandidate', () => {
  it('maps a full volume correctly', () => {
    const cand = mapGBVolumeToCandidate(fullVolume);
    expect(cand).not.toBeNull();
    expect(cand!.title).toBe('The Three-Body Problem');
    expect(cand!.authors).toEqual(['Cixin Liu', 'Ken Liu']);
    expect(cand!.publisher).toBe('Tor Books');
    expect(cand!.isbn13).toBe('9780765377067');
    expect(cand!.isbn10).toBe('0765377063');
    expect(cand!.source).toBe('google_books');
    expect(cand!.externalId).toBe('sample-id-1');
    expect(cand!.externalUrl).toBe('https://books.google.com/books/about/abc');
    expect(cand!.identifiers).toEqual([
      { type: 'other', value: 'GOOG:abc', source: 'google_books' },
    ]);
  });

  it('shortens "en-US" to "en"', () => {
    const cand = mapGBVolumeToCandidate(fullVolume);
    expect(cand!.language).toBe('en');
  });

  it('shortens "zh-CN" to "zh"', () => {
    const v: GBVolume = {
      ...fullVolume,
      volumeInfo: { ...fullVolume.volumeInfo!, language: 'zh-CN' },
    };
    expect(mapGBVolumeToCandidate(v)!.language).toBe('zh');
  });

  it('prefers extraLarge over thumbnail and rewrites http→https', () => {
    const cand = mapGBVolumeToCandidate(fullVolume);
    expect(cand!.coverUrl).toBe('https://example.com/xl.jpg');
  });

  it('falls back through imageLinks ladder', () => {
    const v: GBVolume = {
      ...fullVolume,
      volumeInfo: {
        ...fullVolume.volumeInfo!,
        imageLinks: { thumbnail: 'http://example.com/t.jpg' },
      },
    };
    expect(mapGBVolumeToCandidate(v)!.coverUrl).toBe('https://example.com/t.jpg');
  });

  it('returns null when title is missing', () => {
    const v: GBVolume = {
      id: 'x',
      volumeInfo: { authors: ['A'] },
    };
    expect(mapGBVolumeToCandidate(v)).toBeNull();
  });

  it('returns null when volumeInfo is missing', () => {
    expect(mapGBVolumeToCandidate({ id: 'x' })).toBeNull();
  });

  it('handles missing industryIdentifiers', () => {
    const v: GBVolume = {
      id: 'x',
      volumeInfo: { title: 'T', authors: ['A'] },
    };
    const cand = mapGBVolumeToCandidate(v)!;
    expect(cand.isbn10).toBeUndefined();
    expect(cand.isbn13).toBeUndefined();
    expect(cand.identifiers).toEqual([]);
  });

  it('skips invalid ISBN identifiers', () => {
    const v: GBVolume = {
      id: 'x',
      volumeInfo: {
        title: 'T',
        authors: ['A'],
        industryIdentifiers: [{ type: 'ISBN_13', identifier: 'bogus' }],
      },
    };
    const cand = mapGBVolumeToCandidate(v)!;
    expect(cand.isbn13).toBeUndefined();
  });
});
