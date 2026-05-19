import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildCacheKey, readCache, writeCache } from './cache.js';
import { setupMemoryDb } from '../test/db-setup.js';

describe('search cache', () => {
  let closeDb: () => void;

  beforeAll(async () => {
    ({ closeDb } = await setupMemoryDb());
  });

  afterAll(() => closeDb());

  it('writes and reads before expiry', () => {
    const key = buildCacheKey({
      provider: 'open_library',
      queryType: 'isbn',
      query: '9787536692930',
    });
    writeCache(key, [{ title: 'cached' }], 1, { query: '9787536692930', queryType: 'isbn' });
    const hit = readCache<{ title: string }[]>(key);
    expect(hit).toEqual([{ title: 'cached' }]);
  });

  it('returns null for unknown key', () => {
    expect(readCache('missing-key')).toBeNull();
  });
});
