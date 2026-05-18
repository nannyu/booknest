#!/usr/bin/env tsx
/**
 * Fixture 录制器：直接调真实 Provider API，把响应存到 fixtures/。
 *
 * 用法：
 *   tsx scripts/record-fixture.ts open-library isbn 9787536692930
 *   tsx scripts/record-fixture.ts google-books isbn 9787536692930
 *   tsx scripts/record-fixture.ts open-library title 三体
 *
 * 输出：fixtures/<provider>/<type>-<query>.json
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface RecordArgs {
  provider: 'open-library' | 'google-books' | 'crossref' | 'loc';
  type: 'isbn' | 'title';
  query: string;
}

const ALLOWED_PROVIDERS = ['open-library', 'google-books', 'crossref', 'loc'];

function parseArgs(): RecordArgs {
  const [, , provider, type, ...rest] = process.argv;
  if (!provider || !type || rest.length === 0) {
    console.error('usage: tsx scripts/record-fixture.ts <provider> <isbn|title> <query>');
    process.exit(1);
  }
  if (!ALLOWED_PROVIDERS.includes(provider)) {
    console.error('unknown provider', provider);
    process.exit(1);
  }
  if (type !== 'isbn' && type !== 'title') {
    console.error('unknown type', type);
    process.exit(1);
  }
  return { provider: provider as RecordArgs['provider'], type, query: rest.join(' ') };
}

function buildUrl(args: RecordArgs): string {
  if (args.provider === 'open-library') {
    const q = args.type === 'isbn' ? `isbn:${args.query}` : args.query;
    const fields = [
      'key', 'title', 'subtitle', 'author_name', 'author_key',
      'publisher', 'publish_date', 'publish_year', 'first_publish_year',
      'isbn', 'language', 'cover_i', 'cover_edition_key', 'edition_key',
      'number_of_pages_median', 'first_sentence', 'subject',
    ].join(',');
    const params = new URLSearchParams({ q, fields, limit: '5' });
    return `https://openlibrary.org/search.json?${params.toString()}`;
  }
  if (args.provider === 'google-books') {
    const q = args.type === 'isbn' ? `isbn:${args.query}` : args.query;
    const params = new URLSearchParams({ q, maxResults: '5' });
    if (process.env.GOOGLE_BOOKS_API_KEY) params.set('key', process.env.GOOGLE_BOOKS_API_KEY);
    return `https://www.googleapis.com/books/v1/volumes?${params.toString()}`;
  }
  if (args.provider === 'crossref') {
    const q = encodeURIComponent(args.query);
    if (args.type === 'isbn') {
      return `https://api.crossref.org/works?filter=isbn:${q}&rows=5`;
    }
    return `https://api.crossref.org/works?query.title=${q}&rows=5`;
  }
  // loc
  const q = encodeURIComponent(args.query);
  return `https://www.loc.gov/books/?q=${q}&fo=json`;
}

function safeName(s: string): string {
  return s.replace(/[^a-zA-Z0-9一-鿿_-]/g, '_');
}

async function main() {
  const args = parseArgs();
  const url = buildUrl(args);
  console.log(`GET ${url}`);
  const res = await fetch(url, {
    headers: {
      'user-agent': 'BookNest/0.1-fixture-recorder (+https://github.com/booknest/booknest)',
    },
  });
  console.log(`HTTP ${res.status}`);
  const data = await res.json();

  const dir = join('fixtures', args.provider);
  mkdirSync(dir, { recursive: true });
  const filename = `${args.type}-${safeName(args.query)}.json`;
  const path = join(dir, filename);
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`wrote ${path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
