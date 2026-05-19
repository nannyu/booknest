/**
 * Library of Congress Provider。
 */

import type {
  BookProvider,
  ProviderFetchResult,
  SearchAuthorParams,
  SearchTitleParams,
} from '@booknest/shared';
import { fetchJson } from '../../lib/http.js';
import { mapLOCResultToCandidate } from './mapper.js';
import type { LOCResponse } from './types.js';

const BASE = 'https://www.loc.gov/books';

export class LOCProvider implements BookProvider {
  readonly name = 'loc';

  async searchByISBN(isbn: string, signal?: AbortSignal): Promise<ProviderFetchResult> {
    const url = `${BASE}/?q=${encodeURIComponent(isbn)}&fo=json`;
    const data = await fetchJson<LOCResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    return { candidates: mapItems(data), snapshot: data };
  }

  async searchByTitle(params: SearchTitleParams, signal?: AbortSignal): Promise<ProviderFetchResult> {
    const q = params.author ? `${params.title} ${params.author}` : params.title;
    const url = `${BASE}/?q=${encodeURIComponent(q)}&fo=json`;
    const data = await fetchJson<LOCResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    return { candidates: mapItems(data), snapshot: data };
  }

  async searchByAuthor(params: SearchAuthorParams, signal?: AbortSignal): Promise<ProviderFetchResult> {
    const url = `${BASE}/?q=${encodeURIComponent(params.author)}&fo=json`;
    const data = await fetchJson<LOCResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    return { candidates: mapItems(data), snapshot: data };
  }
}

function mapItems(data: LOCResponse) {
  const items = data.content?.results;
  if (!items || items.length === 0) return [];
  return items.map(mapLOCResultToCandidate).filter((c): c is NonNullable<ReturnType<typeof mapLOCResultToCandidate>> => c !== null);
}
