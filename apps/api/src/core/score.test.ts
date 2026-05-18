/**
 * scoreCandidate 基线测试。
 * 改权重时跑这个，看分数是否还在期望范围内。
 */

import { describe, expect, it } from 'vitest';
import type { BookCandidate, SearchQuery } from '@booknest/shared';
import { scoreCandidate } from './score.js';

function cand(over: Partial<BookCandidate> = {}): BookCandidate {
  return {
    title: '三体',
    authors: ['刘慈欣'],
    source: 'open_library',
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
    const broken = { title: '', authors: [], source: 's', raw: null } as BookCandidate;
    const s = scoreCandidate(broken, q);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});
