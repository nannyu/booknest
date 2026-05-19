import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { BookProvider, ProviderConfig, ProviderFetchResult } from '@booknest/shared';
import { setupMemoryDb } from '../test/db-setup.js';

const mockConfig: ProviderConfig = {
  name: 'mock_books',
  enabled: true,
  priority: 100,
  riskLevel: 'low',
  supportsISBN: true,
  supportsTitleSearch: true,
  supportsAuthorSearch: false,
  supportsCover: false,
  rateLimitPerMinute: 1000,
  cacheTtlDays: 1,
  timeoutMs: 5000,
};

const mockProvider: BookProvider = {
  name: 'mock_books',
  async searchByISBN(isbn: string): Promise<ProviderFetchResult> {
    return {
      candidates: [
        {
          title: 'Mock Book',
          authors: ['Mock Author'],
          source: 'mock_books',
          raw: null,
          isbn13: isbn.length === 13 ? isbn : undefined,
          isbn10: isbn.length === 10 ? isbn : '0765377067',
          externalId: 'mock-1',
        },
      ],
      snapshot: { provider: 'mock_books', isbn },
    };
  },
  async searchByTitle(): Promise<ProviderFetchResult> {
    return { candidates: [], snapshot: null };
  },
};

vi.mock('../config/providers.js', () => ({
  getEnabledProviders: () => [{ config: mockConfig, provider: mockProvider }],
}));

describe('searchBooks', () => {
  let closeDb: () => void;
  let searchBooks: typeof import('./router.js').searchBooks;

  beforeAll(async () => {
    ({ closeDb } = await setupMemoryDb());
    searchBooks = (await import('./router.js')).searchBooks;
  });

  afterAll(() => closeDb());

  it('returns ranked results with stable ids and snapshots', async () => {
    const result = await searchBooks({
      raw: '9780765377067',
      queryType: 'isbn',
      isbn: '9780765377067',
      limit: 5,
    });
    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.title).toBe('Mock Book');
    expect(result.results[0]!.ephemeral).toBeFalsy();
    expect(result.results[0]!.workId).toBeTruthy();
    expect(result.results[0]!.sources[0]!.name).toBe('mock_books');

    const db = (await import('../db/client.js')).getDb();
    const snaps = db.select().from((await import('../db/schema.js')).sourceSnapshots).all();
    expect(snaps.length).toBeGreaterThanOrEqual(1);
    expect(snaps[0]!.responseJson).toMatchObject({ provider: 'mock_books' });
  });
});
