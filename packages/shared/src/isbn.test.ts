import { describe, expect, it } from 'vitest';
import {
  detectISBNFormat,
  isValidISBN,
  isValidISBN10,
  isValidISBN13,
  normalizeISBN,
  parseISBN,
  toISBN10,
  toISBN13,
} from './isbn.js';

describe('normalizeISBN', () => {
  it('strips "ISBN" prefix and separators', () => {
    expect(normalizeISBN('ISBN 978-7-5366-9293-0')).toBe('9787536692930');
    expect(normalizeISBN('isbn-13: 978 7536 692 930')).toBe('9787536692930');
  });

  it('converts full-width digits to half-width', () => {
    expect(normalizeISBN('９７８７５３６６９２９３０')).toBe('9787536692930');
  });

  it('uppercases trailing X', () => {
    expect(normalizeISBN('0-306-40615-x')).toBe('030640615X');
  });

  it('drops everything that is not 0-9 or X', () => {
    expect(normalizeISBN('978-7-5366-9293-0 (paperback)')).toBe('9787536692930');
  });
});

describe('isValidISBN10', () => {
  it('accepts valid checksums', () => {
    expect(isValidISBN10('0306406152')).toBe(true);
    expect(isValidISBN10('043942089X')).toBe(true);
  });

  it('rejects bad checksums', () => {
    expect(isValidISBN10('0306406151')).toBe(false);
    expect(isValidISBN10('0306406150')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidISBN10('030640615')).toBe(false);
    expect(isValidISBN10('03064061520')).toBe(false);
  });
});

describe('isValidISBN13', () => {
  it('accepts valid checksums', () => {
    expect(isValidISBN13('9787536692930')).toBe(true);
    expect(isValidISBN13('9780765377067')).toBe(true);
  });

  it('rejects bad checksums', () => {
    expect(isValidISBN13('9787536692931')).toBe(false);
  });
});

describe('isValidISBN', () => {
  it('accepts both ISBN-10 and ISBN-13', () => {
    expect(isValidISBN('0306406152')).toBe(true);
    expect(isValidISBN('9787536692930')).toBe(true);
  });
});

describe('detectISBNFormat', () => {
  it('returns isbn13 / isbn10 / null', () => {
    expect(detectISBNFormat('9787536692930')).toBe('isbn13');
    expect(detectISBNFormat('0306406152')).toBe('isbn10');
    expect(detectISBNFormat('123')).toBeNull();
  });
});

describe('toISBN13', () => {
  it('converts ISBN-10 to 978-prefixed ISBN-13', () => {
    expect(toISBN13('0306406152')).toBe('9780306406157');
  });
});

describe('toISBN10', () => {
  it('converts 978 ISBN-13 to ISBN-10', () => {
    expect(toISBN10('9780306406157')).toBe('0306406152');
  });

  it('returns null for 979-prefixed ISBN-13', () => {
    expect(toISBN10('9791234567896')).toBeNull();
  });
});

describe('parseISBN', () => {
  it('returns both forms for 978-prefix ISBN-13 input', () => {
    expect(parseISBN('9780306406157')).toEqual({
      isbn10: '0306406152',
      isbn13: '9780306406157',
    });
  });

  it('returns only isbn13 for 979 input', () => {
    const r = parseISBN('9791234567896');
    expect(r?.isbn13).toBe('9791234567896');
    expect(r?.isbn10).toBeUndefined();
  });

  it('returns both forms for ISBN-10 input', () => {
    expect(parseISBN('0306406152')).toEqual({
      isbn10: '0306406152',
      isbn13: '9780306406157',
    });
  });

  it('returns null for invalid input', () => {
    expect(parseISBN('not-an-isbn')).toBeNull();
  });

  it('normalizes input before parsing', () => {
    expect(parseISBN('ISBN 978-7-5366-9293-0')?.isbn13).toBe('9787536692930');
  });
});
