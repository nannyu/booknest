import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mapCrossrefWorkToCandidate } from './mapper.js';
import type { CrossrefWork } from './types.js';

function loadFixture(name: string): CrossrefWork[] {
  const path = join(import.meta.dirname, '../../../../../fixtures/crossref', name);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  return data.message?.items ?? [];
}

describe('mapCrossrefWorkToCandidate', () => {
  it('maps a fixture-driven academic work', () => {
    const items = loadFixture('title-Introduction_to_Algorithms.json');
    expect(items.length).toBeGreaterThan(0);
    const cand = mapCrossrefWorkToCandidate(items[0]!);
    expect(cand).not.toBeNull();
    expect(cand!.source).toBe('crossref');
    expect(cand!.authors.length).toBeGreaterThan(0);
  });

  it('returns null when title is missing', () => {
    expect(mapCrossrefWorkToCandidate({} as CrossrefWork)).toBeNull();
  });

  it('extracts year from date-parts', () => {
    const cand = mapCrossrefWorkToCandidate({
      title: ['T'],
      'published-print': { 'date-parts': [[2012]] },
    } as CrossrefWork);
    expect(cand!.publishedDate).toBe('2012');
  });

  it('extracts year from published-online fallback', () => {
    const cand = mapCrossrefWorkToCandidate({
      title: ['T'],
      'published-online': { 'date-parts': [[2020]] },
    } as CrossrefWork);
    expect(cand!.publishedDate).toBe('2020');
  });

  it('parses ISBNs correctly', () => {
    const cand = mapCrossrefWorkToCandidate({
      title: ['T'],
      ISBN: ['9780306406157', '0306406152'],
    } as CrossrefWork);
    expect(cand!.isbn13).toBe('9780306406157');
    expect(cand!.isbn10).toBe('0306406152');
  });

  it('builds author names from given+family', () => {
    const cand = mapCrossrefWorkToCandidate({
      title: ['T'],
      author: [{ given: 'Thomas H.', family: 'Cormen' }, { name: 'John Doe' }],
    } as CrossrefWork);
    expect(cand!.authors).toContain('Thomas H. Cormen');
    expect(cand!.authors).toContain('John Doe');
  });
});
