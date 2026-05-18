/**
 * 商业 ISBN preset 测试。
 * 没用 fixture（每个 preset 需要付费 key），用内联代表样本。
 */

import { describe, expect, it } from 'vitest';
import { PRESETS } from './presets.js';

describe('commercial-isbn presets', () => {
  describe('isbndb', () => {
    const p = PRESETS.isbndb;

    it('builds correct URL', () => {
      expect(p.buildUrl('9780765377067')).toBe(
        'https://api2.isbndb.com/book/9780765377067',
      );
    });

    it('builds Authorization header', () => {
      expect(p.buildAuthHeader('mykey')).toEqual({ name: 'Authorization', value: 'mykey' });
    });

    it('maps a typical ISBNdb book response', () => {
      const cands = p.mapResponse({
        book: {
          title: 'The Three-Body Problem',
          title_long: 'The Three-Body Problem',
          authors: ['Cixin Liu', 'Ken Liu'],
          publisher: 'Tor Books',
          date_published: '2014',
          isbn: '0765377063',
          isbn13: '9780765377067',
          language: 'en',
          pages: 416,
          image: 'http://images.isbndb.com/cover.jpg',
          subjects: ['Fiction'],
          synopsis: 'A first contact novel.',
        },
      });
      expect(cands).toHaveLength(1);
      const c = cands[0]!;
      expect(c.title).toBe('The Three-Body Problem');
      expect(c.isbn13).toBe('9780765377067');
      expect(c.isbn10).toBe('0765377063');
      expect(c.authors).toEqual(['Cixin Liu', 'Ken Liu']);
      expect(c.pageCount).toBe(416);
      expect(c.coverUrl).toBe('https://images.isbndb.com/cover.jpg'); // http→https
      expect(c.source).toBe('commercial_isbn');
    });

    it('returns empty array when book is missing', () => {
      expect(p.mapResponse({})).toEqual([]);
      expect(p.mapResponse(null)).toEqual([]);
    });

    it('returns empty array when title is missing', () => {
      expect(p.mapResponse({ book: { isbn: '0000' } })).toEqual([]);
    });
  });

  describe('api_ninjas', () => {
    const p = PRESETS.api_ninjas;

    it('builds correct URL', () => {
      expect(p.buildUrl('9780765377067')).toBe(
        'https://api.api-ninjas.com/v1/isbn?isbn=9780765377067',
      );
    });

    it('builds X-Api-Key header', () => {
      expect(p.buildAuthHeader('mykey')).toEqual({ name: 'X-Api-Key', value: 'mykey' });
    });

    it('maps an array response', () => {
      const cands = p.mapResponse([
        {
          title: 'The Three-Body Problem',
          authors: ['Cixin Liu'],
          publisher: 'Tor Books',
          year: 2014,
          isbn_13: '9780765377067',
        },
      ]);
      expect(cands).toHaveLength(1);
      expect(cands[0]!.title).toBe('The Three-Body Problem');
      expect(cands[0]!.publishedDate).toBe('2014');
      expect(cands[0]!.isbn13).toBe('9780765377067');
    });

    it('uses author (singular) as fallback', () => {
      const cands = p.mapResponse([{ title: 'T', author: 'Solo' }]);
      expect(cands[0]!.authors).toEqual(['Solo']);
    });

    it('returns empty array on empty response', () => {
      expect(p.mapResponse([])).toEqual([]);
      expect(p.mapResponse(null)).toEqual([]);
    });

    it('skips items without title', () => {
      const cands = p.mapResponse([{ author: 'X' }, { title: 'Real' }]);
      expect(cands).toHaveLength(1);
      expect(cands[0]!.title).toBe('Real');
    });
  });
});
