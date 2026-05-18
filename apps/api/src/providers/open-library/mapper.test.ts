/**
 * OL mapper 测试，fixture 驱动。
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { OLSearchResponse } from './types.js';
import { mapOLDocToCandidate } from './mapper.js';

function loadFixture(name: string): OLSearchResponse {
  const path = join(import.meta.dirname, '../../../../../fixtures/open-library', name);
  return JSON.parse(readFileSync(path, 'utf8')) as OLSearchResponse;
}

describe('mapOLDocToCandidate', () => {
  it('maps the Chinese 三体 fixture', () => {
    const data = loadFixture('isbn-9787536692930.json');
    const doc = data.docs[0];
    expect(doc).toBeDefined();
    const cand = mapOLDocToCandidate(doc!);
    expect(cand).not.toBeNull();
    expect(cand!.source).toBe('open_library');
    expect(cand!.authors).toContain('刘慈欣');
    // 此 fixture 是 work-merged 数据，包含 isbn 数组
    expect(typeof cand!.title).toBe('string');
    expect(cand!.title.length).toBeGreaterThan(0);
    // cover_i → covers.openlibrary.org URL
    expect(cand!.coverUrl).toMatch(/^https:\/\/covers\.openlibrary\.org/);
    expect(cand!.externalUrl).toMatch(/^https:\/\/openlibrary\.org\//);
  });

  it('maps the English Tor edition fixture', () => {
    const data = loadFixture('isbn-9780765377067.json');
    const doc = data.docs[0];
    expect(doc).toBeDefined();
    const cand = mapOLDocToCandidate(doc!);
    expect(cand).not.toBeNull();
    expect(cand!.authors).toContain('刘慈欣');
  });

  it('returns null when doc has no title', () => {
    expect(mapOLDocToCandidate({ key: '/works/X' })).toBeNull();
  });

  it('maps ISO 639-2 language to ISO 639-1', () => {
    const cand = mapOLDocToCandidate({
      key: '/works/X',
      title: 'T',
      author_name: ['A'],
      language: ['chi'],
    });
    expect(cand?.language).toBe('zh');
  });

  it('splits mixed ISBN array into isbn10 / isbn13', () => {
    const cand = mapOLDocToCandidate({
      key: '/works/X',
      title: 'T',
      author_name: ['A'],
      isbn: ['9780306406157', '0306406152', 'bogus'],
    });
    expect(cand?.isbn13).toBe('9780306406157');
    expect(cand?.isbn10).toBe('0306406152');
  });

  it('falls back to cover-by-ISBN when cover_i missing', () => {
    const cand = mapOLDocToCandidate({
      key: '/works/X',
      title: 'T',
      author_name: ['A'],
      isbn: ['9780306406157'],
    });
    expect(cand?.coverUrl).toBe(
      'https://covers.openlibrary.org/b/isbn/9780306406157-L.jpg',
    );
  });
});
