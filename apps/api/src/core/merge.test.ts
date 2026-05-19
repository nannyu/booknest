/**
 * mergeCandidates 测试。
 *
 * 重点：
 * - 同 ISBN 跨源合并；不同 ISBN 不合并（Work ≠ Edition）
 * - 字段按 FIELD_PRIORITY 选优
 * - sources 列表去重 + 优先级排序
 */

import { describe, expect, it } from 'vitest';
import type { BookCandidate } from '@booknest/shared';
import { groupKey, mergeCandidates } from './merge.js';

function ol(over: Partial<BookCandidate> = {}): BookCandidate {
  return {
    title: '三体',
    authors: ['刘慈欣'],
    source: 'open_library',
    raw: null,
    isbn13: '9787536692930',
    ...over,
  };
}

function gb(over: Partial<BookCandidate> = {}): BookCandidate {
  return {
    title: '三体',
    authors: ['刘慈欣'],
    source: 'google_books',
    raw: null,
    isbn13: '9787536692930',
    ...over,
  };
}

describe('mergeCandidates', () => {
  it('merges two sources by shared ISBN-13', () => {
    const out = mergeCandidates([
      ol({ description: 'OL desc', coverUrl: 'ol-cover' }),
      gb({ description: 'GB desc', coverUrl: 'gb-cover' }),
    ]);
    expect(out).toHaveLength(1);
    // description / coverUrl 优先级：google_books > open_library
    expect(out[0]!.description).toBe('GB desc');
    expect(out[0]!.coverUrl).toBe('gb-cover');
    expect(out[0]!.sources).toEqual(['google_books', 'open_library']);
  });

  it('keeps different ISBN editions separate', () => {
    const out = mergeCandidates([
      ol({ isbn13: '9787536692930' }),
      gb({ isbn13: '9780765377067' }),
    ]);
    expect(out).toHaveLength(2);
  });

  it('fills missing fields from the other source', () => {
    const out = mergeCandidates([
      ol({ publisher: '重庆出版社', publishedDate: undefined }),
      gb({ publisher: undefined, publishedDate: '2008-01-01' }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.publisher).toBe('重庆出版社');
    expect(out[0]!.publishedDate).toBe('2008-01-01');
  });

  it('falls back to title+author grouping when ISBN missing', () => {
    const out = mergeCandidates([
      ol({ isbn13: undefined, isbn10: undefined, title: '三体' }),
      gb({ isbn13: undefined, isbn10: undefined, title: '三体' }),
    ]);
    expect(out).toHaveLength(1);
  });

  it('concatenates identifiers from all sources', () => {
    const out = mergeCandidates([
      ol({ identifiers: [{ type: 'olid', value: 'OL1' }] }),
      gb({ identifiers: [{ type: 'other', value: 'GOOG:x' }] }),
    ]);
    expect(out[0]!.identifiers).toHaveLength(2);
  });

  it('embeds per-source raw in merged.raw', () => {
    const out = mergeCandidates([ol({ raw: { ol: 1 } }), gb({ raw: { gb: 1 } })]);
    expect(Array.isArray(out[0]!.raw)).toBe(true);
    expect((out[0]!.raw as unknown[]).length).toBe(2);
  });

  it('orders sources by FIELD_PRIORITY', () => {
    const out = mergeCandidates([gb(), ol()]);
    // FIELD_PRIORITY.title 把 google_books 排在 open_library 前
    expect(out[0]!.sources).toEqual(['google_books', 'open_library']);
  });

  it('does not merge no-ISBN rows with different publishers', () => {
    const out = mergeCandidates([
      ol({ isbn13: undefined, isbn10: undefined, title: '三体', publisher: 'A社' }),
      gb({ isbn13: undefined, isbn10: undefined, title: '三体', publisher: 'B社' }),
    ]);
    expect(out).toHaveLength(2);
  });

  it('does not merge no-ISBN rows with different translators', () => {
    const out = mergeCandidates([
      ol({
        isbn13: undefined,
        isbn10: undefined,
        title: '三体',
        translators: ['刘宇昆'],
      }),
      gb({
        isbn13: undefined,
        isbn10: undefined,
        title: '三体',
        translators: ['Ken Liu'],
      }),
    ]);
    expect(out).toHaveLength(2);
  });

  it('groupKey differs when language differs', () => {
    expect(
      groupKey(ol({ isbn13: undefined, isbn10: undefined, language: 'zh' })),
    ).not.toBe(groupKey(ol({ isbn13: undefined, isbn10: undefined, language: 'en' })));
  });
});
