/**
 * 通用商业 ISBN Provider。
 *
 * 只支持 ISBN 精确查询。启用与 API key 在启动时由 env 校验。
 */

import type { BookProvider, ProviderFetchResult, SearchTitleParams } from '@booknest/shared';
import { env } from '../../config/env.js';
import { fetchJson } from '../../lib/http.js';
import { PRESETS } from './presets.js';

export class CommercialIsbnProvider implements BookProvider {
  readonly name = 'commercial_isbn';

  async searchByISBN(isbn: string, signal?: AbortSignal): Promise<ProviderFetchResult> {
    const preset = PRESETS[env.COMMERCIAL_ISBN_PRESET]!;
    const url = env.COMMERCIAL_ISBN_API_URL ?? preset.buildUrl(isbn);
    const auth = preset.buildAuthHeader(env.COMMERCIAL_ISBN_API_KEY!);
    const data = await fetchJson<unknown>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
      headers: { [auth.name]: auth.value },
    });
    return { candidates: preset.mapResponse(data), snapshot: data };
  }

  async searchByTitle(_params: SearchTitleParams, _signal?: AbortSignal): Promise<ProviderFetchResult> {
    return { candidates: [], snapshot: null };
  }
}
