/**
 * scoreCandidate 基线测试。
 * 改权重时跑这个，看分数是否还在期望范围内。
 */

import { describe, expect, it } from 'vitest';
import type { SearchQuery } from '@booknest/shared';
import type { MergedCandidate } from './merge.js';
import { scoreCandidate } from './score.js';

function cand(over: Partial<MergedCandidate> = {}): MergedCandidate {
  return {
    title: '三体',
    authors: ['刘慈欣'],
    source: 'open_library',
    sources: ['open_library'],
    sourceMeta: [{ name: 'open_library' }],
    raw: null,
    ...over,
  };
}

describe('scoreCandidate', () => {
  it('high score on ISBN exact + title + cover', () => {
    const q: SearchQuery = {
      raw: '9787536692930',
      queryType: 'isbn',
      isbn: '9787536692930',
      title: '三体',
    };
    const c = cand({ isbn13: '9787536692930', coverUrl: 'https://x/cover.jpg' });
    const s = scoreCandidate(c, q);
    expect(s).toBeGreaterThan(80);
  });

  it('ISBN mismatch loses the 60-point bonus', () => {
    const q: SearchQuery = {
      raw: '9787536692930',
      queryType: 'isbn',
      isbn: '9787536692930',
    };
    const matching = cand({ isbn13: '9787536692930' });
    const wrong = cand({ isbn13: '9780000000002' });
    expect(scoreCandidate(matching, q)).toBeGreaterThan(scoreCandidate(wrong, q) + 50);
  });

  it('title-only search rewards similarity', () => {
    const q: SearchQuery = {
      raw: '三体',
      queryType: 'title',
      title: '三体',
    };
    const close = cand({ title: '三体（典藏版）', isbn13: '9787536692930' });
    const far = cand({ title: '红楼梦', isbn13: '9787536692931' });
    expect(scoreCandidate(close, q)).toBeGreaterThan(scoreCandidate(far, q));
  });

  it('candidate without ISBN gets a 20-point penalty', () => {
    const q: SearchQuery = { raw: '三体', queryType: 'title', title: '三体' };
    const withIsbn = cand({ isbn13: '9787536692930' });
    const without = cand({});
    expect(scoreCandidate(withIsbn, q) - scoreCandidate(without, q)).toBeGreaterThanOrEqual(20);
  });

  it('publisher and year bonus add up', () => {
    const q: SearchQuery = {
      raw: '三体',
      queryType: 'title',
      title: '三体',
      publisher: '重庆出版社',
      year: 2008,
    };
    const c = cand({
      isbn13: '9787536692930',
      publisher: '重庆出版社',
      publishedDate: '2008-01',
    });
    expect(scoreCandidate(c, q)).toBeGreaterThan(scoreCandidate(cand({ isbn13: '9787536692930' }), q));
  });

  it('clamps to [0, 100]', () => {
    const q: SearchQuery = { raw: '?', queryType: 'title', title: 'x' };
    const broken = {
      title: '',
      authors: [],
      source: 's',
      sources: [],
      sourceMeta: [],
      raw: null,
    } as MergedCandidate;
    const s = scoreCandidate(broken, q);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });

  it('author-only search rewards exact author match', () => {
    const q: SearchQuery = { raw: '刘慈欣', queryType: 'author', author: '刘慈欣' };
    // 作者完全匹配 + 有 ISBN + 有封面 应该拿到高分
    const c = cand({ isbn13: '9787536692930', coverUrl: 'https://x/cover.jpg' });
    const s = scoreCandidate(c, q);
    expect(s).toBeGreaterThan(60); // author 1.0 × 60 + 封面 3 = 63
  });

  it('author-only: ISBN presence is the tiebreaker', () => {
    const q: SearchQuery = { raw: '刘慈欣', queryType: 'author', author: '刘慈欣' };
    const withIsbn = cand({ isbn13: '9787536692930' });
    const without = cand({});
    expect(scoreCandidate(withIsbn, q)).toBeGreaterThan(scoreCandidate(without, q));
  });

  it('title weight is higher for title query than for isbn query', () => {
    const c = cand({ title: '三体', isbn13: '9787536692930' });
    const isbnQ: SearchQuery = {
      raw: '9787536692930',
      queryType: 'isbn',
      isbn: '9787536692930',
      title: '三体',
    };
    const titleQ: SearchQuery = { raw: '三体', queryType: 'title', title: '三体' };
    // isbn query: title 占 20，title query 占 50；title query 的标题加分应该更多
    const isbnScore = scoreCandidate(c, isbnQ);
    const titleScore = scoreCandidate(c, titleQ);
    // 但 isbn query 还有 +60 的 ISBN 命中，所以总分会比 title 高
    expect(isbnScore).toBeGreaterThan(titleScore);
    // 而 title query 的 title 部分单独看就比 isbn query 多 30
    expect(titleScore).toBeGreaterThanOrEqual(50); // 三体↔三体 ≈ 1 × 50
  });

  it('title_author splits weight between title and author', () => {
    const q: SearchQuery = {
      raw: '刘慈欣 三体',
      queryType: 'title_author',
      title: '三体',
      author: '刘慈欣',
    };
    // 标题 + 作者都完全匹配
    const c = cand({ isbn13: '9787536692930' });
    const s = scoreCandidate(c, q);
    expect(s).toBeGreaterThan(55); // 30 + 30 = 60 - 0 + 0 ≈ 60
  });

  it('multi-source consensus adds points (2 sources +10)', () => {
    const q: SearchQuery = { raw: '9787536692930', queryType: 'isbn', isbn: '9787536692930' };
    const single = cand({ isbn13: '9787536692930' });
    const dual = cand({ isbn13: '9787536692930', sources: ['open_library', 'google_books'] });
    expect(scoreCandidate(dual, q) - scoreCandidate(single, q)).toBe(10);
  });

  it('multi-source consensus: 3 sources +15, 4+ sources +20', () => {
    const q: SearchQuery = { raw: '9787536692930', queryType: 'isbn', isbn: '9787536692930' };
    const triple = cand({ isbn13: '9787536692930', sources: ['ol', 'gb', 'crossref'] });
    const quad = cand({ isbn13: '9787536692930', sources: ['ol', 'gb', 'crossref', 'loc'] });
    const single = cand({ isbn13: '9787536692930' });
    expect(scoreCandidate(triple, q) - scoreCandidate(single, q)).toBe(15);
    expect(scoreCandidate(quad, q) - scoreCandidate(single, q)).toBe(20);
  });

  it('field completeness raises confidence above the bare baseline', () => {
    const q: SearchQuery = { raw: '9787536692930', queryType: 'isbn', isbn: '9787536692930' };
    const bare = cand({ isbn13: '9787536692930', authors: [] });
    const rich = cand({
      isbn13: '9787536692930',
      publisher: '重庆出版社',
      publishedDate: '2008',
      description: '一部硬科幻小说...',
      pageCount: 302,
      language: 'zh',
      categories: ['Science Fiction', 'Hugo Award'],
      coverUrl: 'https://x/cover.jpg',
    });
    // rich 比 bare 多 3+3+3+3+2+2+2+3 = 21 分
    expect(scoreCandidate(rich, q) - scoreCandidate(bare, q)).toBeGreaterThanOrEqual(20);
  });

  it('reaches the recommended threshold (>=80) for typical multi-source ISBN hits', () => {
    const q: SearchQuery = { raw: '9787536692930', queryType: 'isbn', isbn: '9787536692930' };
    const typical = cand({
      isbn13: '9787536692930',
      publisher: '重庆出版社',
      publishedDate: '2008',
      pageCount: 302,
      language: 'zh',
      coverUrl: 'https://x/cover.jpg',
      sources: ['open_library', 'google_books'],
    });
    expect(scoreCandidate(typical, q)).toBeGreaterThanOrEqual(80);
  });
});
