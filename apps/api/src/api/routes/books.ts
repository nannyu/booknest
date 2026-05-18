/**
 * 图书查询路由。
 *   GET /api/books/search?q=...&type=...&limit=...&language=...
 *   GET /api/books/isbn/:isbn
 *
 * 路由层只做参数解析 + 调 core，不写业务逻辑。
 */

import { Hono } from 'hono';
import { z } from 'zod';
import type { SearchQuery } from '@booknest/shared';
import {
  BookNestError,
  detectQueryType,
  isValidISBN,
  normalizeISBN,
  splitTitleAuthor,
} from '@booknest/shared';
import { searchBooks } from '../../core/router.js';

const books = new Hono();

const searchSchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(['isbn', 'title', 'title_author']).optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  language: z.string().optional(),
});

books.get('/search', async (c) => {
  const parsed = searchSchema.safeParse(c.req.query());
  if (!parsed.success) {
    throw new BookNestError(
      'INVALID_QUERY',
      'invalid query params',
      400,
      parsed.error.flatten(),
    );
  }
  const { q, type, limit, language } = parsed.data;
  const queryType = type ?? detectQueryType(q);

  let query: SearchQuery;
  if (queryType === 'isbn') {
    const isbn = normalizeISBN(q);
    if (!isValidISBN(isbn)) {
      throw new BookNestError('INVALID_ISBN', `not a valid ISBN: ${q}`, 400);
    }
    query = { raw: q, queryType, isbn, limit, language };
  } else if (queryType === 'title_author') {
    const split = splitTitleAuthor(q);
    query = {
      raw: q,
      queryType,
      title: split.title,
      author: split.author,
      limit,
      language,
    };
  } else {
    query = { raw: q, queryType: 'title', title: q, limit, language };
  }

  const result = await searchBooks(query);
  return c.json(result);
});

books.get('/isbn/:isbn', async (c) => {
  const raw = c.req.param('isbn');
  const isbn = normalizeISBN(raw);
  if (!isValidISBN(isbn)) {
    throw new BookNestError('INVALID_ISBN', `not a valid ISBN: ${raw}`, 400);
  }
  const result = await searchBooks({
    raw: isbn,
    queryType: 'isbn',
    isbn,
    limit: 5,
  });
  return c.json(result);
});

export default books;
