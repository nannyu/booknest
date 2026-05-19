/**
 * Crossref Provider。
 */

import type {
  BookProvider,
  ProviderFetchResult,
  SearchAuthorParams,
  SearchTitleParams,
} from '@booknest/shared';
import { fetchJson } from '../../lib/http.js';
import { mapCrossrefWorkToCandidate } from './mapper.js';
import type { CrossrefWorksResponse } from './types.js';

const BASE = 'https://api.crossref.org/works';

export class CrossrefProvider implements BookProvider {
  readonly name = 'crossref';

  async searchByISBN(isbn: string, signal?: AbortSignal): Promise<ProviderFetchResult> {
    const url = `${BASE}?filter=isbn:${encodeURIComponent(isbn)}&rows=5`;
    const data = await fetchJson<CrossrefWorksResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    return { candidates: mapItems(data), snapshot: data };
  }

  async searchByTitle(params: SearchTitleParams, signal?: AbortSignal): Promise<ProviderFetchResult> {
    const q = params.author ? `${params.title} ${params.author}` : params.title;
    const url = `${BASE}?query.title=${encodeURIComponent(q)}&rows=${Math.min(params.limit ?? 10, 20)}`;
    const data = await fetchJson<CrossrefWorksResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    return { candidates: mapItems(data), snapshot: data };
  }

  async searchByAuthor(params: SearchAuthorParams, signal?: AbortSignal): Promise<ProviderFetchResult> {
    const url = `${BASE}?query.author=${encodeURIComponent(params.author)}&rows=${Math.min(params.limit ?? 20, 20)}`;
    const data = await fetchJson<CrossrefWorksResponse>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
    });
    return { candidates: mapItems(data), snapshot: data };
  }
}

function mapItems(data: CrossrefWorksResponse) {
  const items = data.message?.items;
  if (!items || items.length === 0) return [];
  return items.map(mapCrossrefWorkToCandidate).filter((c): c is NonNullable<ReturnType<typeof mapCrossrefWorkToCandidate>> => c !== null);
}
