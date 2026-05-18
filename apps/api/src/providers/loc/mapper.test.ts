import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapLOCResultToCandidate } from './mapper.js';
import type { LOCResult } from './types.js';

function loadFixture(name: string): LOCResult[] {
  const path = join(import.meta.dirname, '../../../../../fixtures/loc', name);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  return data.content?.results ?? [];
}

describe('mapLOCResultToCandidate', () => {
  it('maps a fixture-driven result', () => {
    const items = loadFixture('title-Introduction_to_Algorithms.json');
    expect(items.length).toBeGreaterThan(0);
    const cand = mapLOCResultToCandidate(items[0]!);
    expect(cand).not.toBeNull();
    expect(cand!.source).toBe('loc');
  });

  it('returns null when title is missing', () => {
    expect(mapLOCResultToCandidate({} as LOCResult)).toBeNull();
  });

  it('picks cover URL and forces https', () => {
    const cand = mapLOCResultToCandidate({
      title: 'T',
      image_url: ['http://example.com/cover.jpg'],
    } as LOCResult);
    expect(cand!.coverUrl).toBe('https://example.com/cover.jpg');
  });

  it('extracts description from description array', () => {
    const cand = mapLOCResultToCandidate({
      title: 'T',
      description: ['A great book.'],
    } as LOCResult);
    expect(cand!.description).toBe('A great book.');
  });

  it('extracts description from item.notes fallback', () => {
    const cand = mapLOCResultToCandidate({
      title: 'T',
      item: { notes: ['Published in 2020'] },
    } as LOCResult);
    expect(cand!.description).toBe('Published in 2020');
  });

  it('uses contributor array for authors', () => {
    const cand = mapLOCResultToCandidate({
      title: 'T',
      contributor: ['Knuth, Donald'],
    } as LOCResult);
    expect(cand!.authors).toContain('Knuth, Donald');
  });

  it('uses item.contributors fallback for authors', () => {
    const cand = mapLOCResultToCandidate({
      title: 'T',
      item: { contributors: ['A. Turing'] },
    } as LOCResult);
    expect(cand!.authors).toContain('A. Turing');
  });
});
