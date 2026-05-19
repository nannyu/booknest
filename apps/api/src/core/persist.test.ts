/**
 * persistMergedCandidate + loadEditionAsRankedBook 集成测试（in-memory SQLite）。
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import type { MergedCandidate } from './merge.js';

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '../db/migrations');

function sampleCandidate(over: Partial<MergedCandidate> = {}): MergedCandidate {
  return {
    title: '三体',
    authors: ['刘慈欣'],
    source: 'open_library+google_books',
    raw: [],
    isbn13: '9787536692930',
    sources: ['open_library', 'google_books'],
    sourceMeta: [
      { name: 'open_library', externalId: 'OL123W', externalUrl: 'https://openlibrary.org/works/OL123W' },
      { name: 'google_books', externalId: 'gb-id-1' },
    ],
    identifiers: [{ type: 'olid', value: 'OL123W', source: 'open_library' }],
    ...over,
  };
}

describe('persistMergedCandidate', () => {
  let persistMergedCandidate: typeof import('./persist.js').persistMergedCandidate;
  let loadEditionAsRankedBook: typeof import('./load.js').loadEditionAsRankedBook;
  let closeDb: typeof import('../db/client.js').closeDb;
  let getDb: typeof import('../db/client.js').getDb;

  beforeAll(async () => {
    process.env.DATABASE_URL = ':memory:';
    const client = await import('../db/client.js');
    closeDb = client.closeDb;
    getDb = client.getDb;
    closeDb();
    migrate(getDb(), { migrationsFolder });
    persistMergedCandidate = (await import('./persist.js')).persistMergedCandidate;
    loadEditionAsRankedBook = (await import('./load.js')).loadEditionAsRankedBook;
  });

  afterAll(() => {
    closeDb();
  });

  it('inserts edition with per-edition sources', () => {
    const id = persistMergedCandidate(sampleCandidate(), 85);
    const book = loadEditionAsRankedBook(id);
    expect(book).not.toBeNull();
    expect(book!.isbn13).toBe('9787536692930');
    expect(book!.sources.map((s) => s.name).sort()).toEqual(['google_books', 'open_library']);
    expect(book!.sources.find((s) => s.name === 'open_library')?.externalId).toBe('OL123W');
    expect(book!.needsReview).toBe(false);
  });

  it('upserts by ISBN and records both sources for second book', () => {
    const id1 = persistMergedCandidate(sampleCandidate(), 80);
    const id2 = persistMergedCandidate(
      sampleCandidate({
        isbn13: '9787111128067',
        title: '设计模式',
        authors: ['Erich Gamma'],
        sources: ['google_books'],
        sourceMeta: [{ name: 'google_books', externalId: 'gb-2' }],
        identifiers: [],
      }),
      75,
    );
    expect(id1).not.toBe(id2);
    const again = persistMergedCandidate(
      sampleCandidate({ title: '三体（修订）', publisher: '重庆出版社' }),
      90,
    );
    expect(again).toBe(id1);
    const book = loadEditionAsRankedBook(id1);
    expect(book!.title).toBe('三体（修订）');
    expect(book!.publisher).toBe('重庆出版社');
    expect(book!.confidence).toBe(90);
    expect(book!.sources).toHaveLength(2);
  });

  it('sets needsReview when confidence below 70', () => {
    const id = persistMergedCandidate(sampleCandidate({ isbn13: '9780000000001' }), 65);
    const book = loadEditionAsRankedBook(id);
    expect(book!.needsReview).toBe(true);
  });
});
