/**
 * persistMergedCandidate + loadEditionAsRankedBook 集成测试（in-memory SQLite）。
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import type { MergedCandidate } from './merge.js';
import { setupMemoryDb } from '../test/db-setup.js';

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
  let closeDb: () => void;
  let getDb: typeof import('../db/client.js').getDb;

  beforeAll(async () => {
    ({ closeDb, getDb } = await setupMemoryDb());
    persistMergedCandidate = (await import('./persist.js')).persistMergedCandidate;
    loadEditionAsRankedBook = (await import('./load.js')).loadEditionAsRankedBook;
  });

  afterAll(() => {
    closeDb();
  });

  it('inserts edition with per-edition sources', () => {
    const { editionId } = persistMergedCandidate(sampleCandidate(), 85);
    const book = loadEditionAsRankedBook(editionId);
    expect(book).not.toBeNull();
    expect(book!.isbn13).toBe('9787536692930');
    expect(book!.sources.map((s) => s.name).sort()).toEqual(['google_books', 'open_library']);
    expect(book!.sources.find((s) => s.name === 'open_library')?.externalId).toBe('OL123W');
    expect(book!.needsReview).toBe(false);
  });

  it('upserts by ISBN and records both sources for second book', () => {
    const { editionId: id1 } = persistMergedCandidate(sampleCandidate(), 80);
    const { editionId: id2 } = persistMergedCandidate(
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
    const { editionId: again } = persistMergedCandidate(
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
    const { editionId } = persistMergedCandidate(sampleCandidate({ isbn13: '9780000000001' }), 65);
    const book = loadEditionAsRankedBook(editionId);
    expect(book!.needsReview).toBe(true);
  });

  it('links different ISBN editions to the same work when title and author match', async () => {
    const { editions } = await import('../db/schema.js');
    const { editionId: idA, workId: workA } = persistMergedCandidate(
      sampleCandidate({ isbn13: '9787536692930', publisher: '重庆出版社' }),
      80,
    );
    const { editionId: idB, workId: workB } = persistMergedCandidate(
      sampleCandidate({
        isbn13: '9780000000002',
        title: '三体',
        authors: ['刘慈欣'],
        publisher: '出版社 B',
        sources: ['google_books'],
        sourceMeta: [{ name: 'google_books' }],
        identifiers: [],
      }),
      75,
    );
    expect(idA).not.toBe(idB);
    const edA = getDb().select().from(editions).where(eq(editions.id, idA)).get();
    const edB = getDb().select().from(editions).where(eq(editions.id, idB)).get();
    expect(workA).toBeTruthy();
    expect(workB).toBe(workA);
    expect(edB!.workId).toBe(edA!.workId);
  });
});
