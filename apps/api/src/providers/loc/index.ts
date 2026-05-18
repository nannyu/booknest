/**
 * Library of Congress Provider。
 * 默认关闭。对英文书/公版书有价值，中文书覆盖弱。
 *
 * 接口：
 *   GET https://www.loc.gov/books/?q={query}&fo=json
 *
 * 无需 API key，在任意 LOC 搜索页后加 `?fo=json` 即可。
 */

import type { BookCandidate, BookProvider, SearchTitleParams } from '@booknest/shared';
import { fetchJson } from '../../lib/http.js';
import { mapLOCResultToCandidate } from './mapper.js';
import type { LOCResponse } from './types.js';

const BASE = 'https://www.loc.gov/books';

export class LOCProvider implements BookProvider {
  readonly name = 'loc';

  async searchByISBN(isbn: string, signal?: AbortSignal): Promise<BookCandidate[]> {
    const url = `${BASE}/?q=${encodeURIComponent(isbn)}&fo=json`;
    const data = await fetchJson<LOCResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    return mapItems(data);
  }

  async searchByTitle(params: SearchTitleParams, signal?: AbortSignal): Promise<BookCandidate[]> {
    const q = params.author ? `${params.title} ${params.author}` : params.title;
    const url = `${BASE}/?q=${encodeURIComponent(q)}&fo=json`;
    const data = await fetchJson<LOCResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    return mapItems(data);
  }
}

function mapItems(data: LOCResponse): BookCandidate[] {
  const items = data.content?.results;
  if (!items || items.length === 0) return [];
  return items.map(mapLOCResultToCandidate).filter((c): c is BookCandidate => c !== null);
}
