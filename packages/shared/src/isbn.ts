/**
 * ISBN 清洗、校验、互转。
 * 设计文档 §10.1。
 */

/**
 * 清洗输入。
 * - 全角数字转半角
 * - 去掉 "ISBN" 前缀
 * - 去掉空格、连字符
 * - 留下 0-9 和 X
 * - 大写
 */
export function normalizeISBN(input: string): string {
  return input
    .replace(/ISBN[-\s]?(10|13)?[:\s]*/i, '')
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[\s\-—–]/g, '')
    .replace(/[^0-9Xx]/g, '')
    .toUpperCase();
}

export function isValidISBN10(isbn: string): boolean {
  if (!/^[0-9]{9}[0-9X]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const ch = isbn[i]!;
    const v = ch === 'X' ? 10 : Number(ch);
    sum += v * (10 - i);
  }
  return sum % 11 === 0;
}

export function isValidISBN13(isbn: string): boolean {
  if (!/^[0-9]{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const v = Number(isbn[i]);
    sum += i % 2 === 0 ? v : v * 3;
  }
  return sum % 10 === 0;
}

export function isValidISBN(isbn: string): boolean {
  return isValidISBN10(isbn) || isValidISBN13(isbn);
}

export type ISBNFormat = 'isbn10' | 'isbn13';

export function detectISBNFormat(isbn: string): ISBNFormat | null {
  if (isValidISBN13(isbn)) return 'isbn13';
  if (isValidISBN10(isbn)) return 'isbn10';
  return null;
}

/**
 * ISBN-10 → ISBN-13 (978-prefix)。
 * 输入必须已校验通过；不校验输入。
 */
export function toISBN13(isbn10: string): string {
  const base = '978' + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const v = Number(base[i]);
    sum += i % 2 === 0 ? v : v * 3;
  }
  const check = (10 - (sum % 10)) % 10;
  return base + check;
}

/**
 * ISBN-13 → ISBN-10。仅对 978-prefix 有效；其他返回 null。
 */
export function toISBN10(isbn13: string): string | null {
  if (!isbn13.startsWith('978')) return null;
  const base = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(base[i]) * (10 - i);
  }
  const checkValue = (11 - (sum % 11)) % 11;
  const checkChar = checkValue === 10 ? 'X' : String(checkValue);
  return base + checkChar;
}

/**
 * 解析为 { isbn10, isbn13 } 对。
 * - 输入是 ISBN-10：返回 { isbn10, isbn13: toISBN13(isbn10) }
 * - 输入是 ISBN-13 且 978 前缀：返回两者
 * - 输入是 ISBN-13 且 979 前缀：只返回 isbn13
 * - 都不是：返回 null
 */
export function parseISBN(input: string): { isbn10?: string; isbn13: string } | null {
  const normalized = normalizeISBN(input);
  const format = detectISBNFormat(normalized);
  if (format === null) return null;

  if (format === 'isbn13') {
    const isbn10 = toISBN10(normalized);
    return isbn10 ? { isbn10, isbn13: normalized } : { isbn13: normalized };
  }

  return { isbn10: normalized, isbn13: toISBN13(normalized) };
}
