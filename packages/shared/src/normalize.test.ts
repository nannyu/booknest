import { describe, expect, it } from 'vitest';
import {
  authorSimilarity,
  canonicalPublisher,
  detectQueryType,
  diceSimilarity,
  nearYear,
  normalizeAuthorName,
  normalizeChineseTitle,
  samePublisher,
  splitTitleAuthor,
  titleSimilarity,
} from './normalize.js';

describe('normalizeChineseTitle', () => {
  it('strips bracketed subtitles', () => {
    expect(normalizeChineseTitle('三体（典藏版）')).toBe('三体');
    expect(normalizeChineseTitle('三体(下)')).toBe('三体');
  });

  it('strips edition markers', () => {
    expect(normalizeChineseTitle('Java核心技术 第10版')).toBe('java核心技术');
    expect(normalizeChineseTitle('Java核心技术 修订版')).toBe('java核心技术');
  });

  it('strips quotes/punctuation/whitespace', () => {
    expect(normalizeChineseTitle('《三体》')).toBe('三体');
    expect(normalizeChineseTitle(' 三  体 ')).toBe('三体');
  });

  it('lowercases ASCII letters', () => {
    expect(normalizeChineseTitle('JavaScript高级程序设计')).toBe('javascript高级程序设计');
  });
});

describe('normalizeAuthorName', () => {
  it('strips nationality prefixes', () => {
    expect(normalizeAuthorName('[美] George R.R. Martin')).toBe('george r.r. martin');
    expect(normalizeAuthorName('(英)简·奥斯汀')).toBe('简·奥斯汀');
  });

  it('strips trailing role char', () => {
    // regex `[著译编绘选]$` 剥末尾单字，trim 再去残留空格
    expect(normalizeAuthorName('刘慈欣著')).toBe('刘慈欣');
    expect(normalizeAuthorName('刘慈欣 著')).toBe('刘慈欣');
  });

  it('collapses whitespace', () => {
    expect(normalizeAuthorName('  George   Martin  ')).toBe('george martin');
  });
});

describe('diceSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(diceSimilarity('三体', '三体')).toBe(1);
  });

  it('returns 0 for completely different strings', () => {
    expect(diceSimilarity('三体', '红楼')).toBe(0);
  });

  it('returns intermediate for partial overlap', () => {
    const s = diceSimilarity('三体的故事', '三体');
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });

  it('handles empty strings', () => {
    expect(diceSimilarity('', '')).toBe(1);
    expect(diceSimilarity('三体', '')).toBe(0);
  });
});

describe('titleSimilarity', () => {
  it('compares normalized titles', () => {
    expect(titleSimilarity('《三体》', '三体（典藏版）')).toBe(1);
  });
});

describe('authorSimilarity', () => {
  it('returns max over multiple candidates', () => {
    const s = authorSimilarity('刘慈欣', ['Cixin Liu', '刘慈欣', 'Ken Liu']);
    expect(s).toBe(1);
  });

  it('returns 0 when query empty', () => {
    expect(authorSimilarity(undefined, ['x'])).toBe(0);
  });
});

describe('canonicalPublisher / samePublisher', () => {
  it('maps aliases to canonical form', () => {
    expect(canonicalPublisher('人邮')).toBe('人民邮电出版社');
    expect(canonicalPublisher('三联')).toBe('生活·读书·新知三联书店');
  });

  it('returns input when no alias known', () => {
    expect(canonicalPublisher('未知出版社')).toBe('未知出版社');
  });

  it('matches across alias forms', () => {
    expect(samePublisher('人邮', '人民邮电出版社')).toBe(true);
    expect(samePublisher('人民邮电', 'Posts and Telecom Press')).toBe(true);
  });
});

describe('nearYear', () => {
  it('handles "2008" / "2008-05" / "2008-05-01"', () => {
    expect(nearYear('2008', 2008)).toBe(true);
    expect(nearYear('2008-05', 2009)).toBe(true);
    expect(nearYear('2008-05-01', 2011)).toBe(false);
  });

  it('respects tolerance', () => {
    expect(nearYear('2008', 2012, 5)).toBe(true);
  });

  it('returns false when year not present', () => {
    expect(nearYear('unknown', 2008)).toBe(false);
  });
});

describe('detectQueryType', () => {
  it('detects ISBN-13', () => {
    expect(detectQueryType('9787536692930')).toBe('isbn');
    expect(detectQueryType('978-7-5366-9293-0')).toBe('isbn');
  });

  it('detects ISBN-10', () => {
    expect(detectQueryType('0306406152')).toBe('isbn');
  });

  it('returns title for single word', () => {
    expect(detectQueryType('三体')).toBe('title');
  });

  it('returns title_author when whitespace present', () => {
    expect(detectQueryType('刘慈欣 三体')).toBe('title_author');
  });
});

describe('splitTitleAuthor', () => {
  it('splits Chinese author + title', () => {
    expect(splitTitleAuthor('刘慈欣 三体')).toEqual({ title: '三体', author: '刘慈欣' });
  });

  it('does not split when first segment is not Chinese name length', () => {
    expect(splitTitleAuthor('The Three Body Problem')).toEqual({
      title: 'The Three Body Problem',
    });
  });
});
