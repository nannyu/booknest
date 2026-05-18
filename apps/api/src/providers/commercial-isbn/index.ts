/**
 * 通用商业 ISBN Provider。
 *
 * 接入流程：
 *   1. .env 设 ENABLE_COMMERCIAL_ISBN=true
 *   2. 选 preset（COMMERCIAL_ISBN_PRESET=isbndb | api_ninjas）
 *   3. 填 API key（COMMERCIAL_ISBN_API_KEY）
 *   4. （可选）COMMERCIAL_ISBN_API_URL 覆盖默认 endpoint
 *
 * 只支持 ISBN 精确查询；不支持书名搜索（商业服务不一定提供，按需扩展）。
 */

import type { BookCandidate, BookProvider, SearchTitleParams } from '@booknest/shared';
import { BookNestError } from '@booknest/shared';
import { env } from '../../config/env.js';
import { fetchJson } from '../../lib/http.js';
import { PRESETS } from './presets.js';

export class CommercialIsbnProvider implements BookProvider {
  readonly name = 'commercial_isbn';

  async searchByISBN(isbn: string, signal?: AbortSignal): Promise<BookCandidate[]> {
    const preset = PRESETS[env.COMMERCIAL_ISBN_PRESET];
    if (!preset) {
      throw new BookNestError(
        'COMMERCIAL_ISBN_PRESET_INVALID',
        `unknown commercial-isbn preset: ${env.COMMERCIAL_ISBN_PRESET}`,
        500,
      );
    }
    if (!env.COMMERCIAL_ISBN_API_KEY) {
      throw new BookNestError(
        'COMMERCIAL_ISBN_KEY_MISSING',
        'COMMERCIAL_ISBN_API_KEY env var is required when ENABLE_COMMERCIAL_ISBN=true',
        500,
      );
    }
    const url = env.COMMERCIAL_ISBN_API_URL ?? preset.buildUrl(isbn);
    const auth = preset.buildAuthHeader(env.COMMERCIAL_ISBN_API_KEY);
    const data = await fetchJson<unknown>(url, {
      provider: this.name,
      timeoutMs: 8000,
      signal,
      headers: { [auth.name]: auth.value },
    });
    return preset.mapResponse(data);
  }

  async searchByTitle(_params: SearchTitleParams, _signal?: AbortSignal): Promise<BookCandidate[]> {
    // 商业 ISBN 服务一般不支持/支持有限的 title search；v0.1 不实现
    return [];
  }
}
