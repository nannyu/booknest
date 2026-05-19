/**
 * NeoDB mapper 测试。
 *
 * 没用 fixture（neodb.social 在部分网络环境不可达），用内联代表样本。
 * 字段名严格对应 catalog/models/{item,book}.py 的 schema。
 */

import { describe, expect, it } from 'vitest';
import { mapNeoDBEditionToCandidate } from './mapper.js';
import type { NeoDBEdition } from './types.js';

const sample: NeoDBEdition = {
  type: 'Edition',
  uuid: 'abc123',
  url: 'https://neodb.social/book/abc123',
  category: 'book',
  title: '三体',
  subtitle: '"地球往事" 三部曲之一',
  description:
    '《三体》以宏大的视野讲述了人类文明与三体文明的第一次接触……',
  cover_image_url: 'http://example.com/cover.jpg',
  rating: 8.9,
  tags: ['科幻', '刘慈欣', '硬科幻'],
  isbn: '9787536692930',
  orig_title: null,
  author: ['刘慈欣'],
  translator: [],
  language: ['zh-cn'],
  publisher: ['重庆出版社'],
  pub_year: 2008,
  pub_month: 1,
  pages: 302,
};

describe('mapNeoDBEditionToCandidate', () => {
  it('maps a complete Chinese book record', () => {
    const cand = mapNeoDBEditionToCandidate(sample);
    expect(cand).not.toBeNull();
    expect(cand!.title).toBe('三体');
    expect(cand!.subtitle).toContain('地球往事');
    expect(cand!.authors).toEqual(['刘慈欣']);
    expect(cand!.publisher).toBe('重庆出版社');
    expect(cand!.publishedDate).toBe('2008-01');
    expect(cand!.isbn13).toBe('9787536692930');
    expect(cand!.language).toBe('zh');
    expect(cand!.pageCount).toBe(302);
    expect(cand!.description).toContain('三体');
    expect(cand!.coverUrl).toBe('https://example.com/cover.jpg'); // http→https
    expect(cand!.categories).toEqual(['科幻', '刘慈欣', '硬科幻']);
    expect(cand!.source).toBe('neodb');
    expect(cand!.externalId).toBe('abc123');
  });

  it('returns null when title is missing', () => {
    expect(mapNeoDBEditionToCandidate({ type: 'Edition', title: '' } as NeoDBEdition)).toBeNull();
  });

  it('uses brief when description is empty', () => {
    const cand = mapNeoDBEditionToCandidate({
      ...sample,
      description: '',
      brief: '简介备用字段',
    });
    expect(cand!.description).toBe('简介备用字段');
  });

  it('falls back to year-only when month missing', () => {
    const cand = mapNeoDBEditionToCandidate({
      ...sample,
      pub_year: 2008,
      pub_month: null,
    });
    expect(cand!.publishedDate).toBe('2008');
  });

  it('parses pages as string', () => {
    const cand = mapNeoDBEditionToCandidate({ ...sample, pages: '416' });
    expect(cand!.pageCount).toBe(416);
  });

  it('rejects invalid ISBN', () => {
    const cand = mapNeoDBEditionToCandidate({ ...sample, isbn: 'bogus' });
    expect(cand!.isbn13).toBeUndefined();
    expect(cand!.isbn10).toBeUndefined();
  });

  it('handles ISBN-10', () => {
    const cand = mapNeoDBEditionToCandidate({ ...sample, isbn: '0306406152' });
    expect(cand!.isbn10).toBe('0306406152');
    expect(cand!.isbn13).toBeUndefined();
  });

  it('shortens language code', () => {
    expect(
      mapNeoDBEditionToCandidate({ ...sample, language: ['zh-Hans'] })!.language,
    ).toBe('zh');
    expect(
      mapNeoDBEditionToCandidate({ ...sample, language: ['en'] })!.language,
    ).toBe('en');
  });
});
