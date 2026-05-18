/**
 * Provider 共享的 HTTP 客户端：
 * - 自动注入 APP_USER_AGENT
 * - 超时控制（AbortController）
 * - JSON 解析 + 状态码错误
 * - 不做缓存（缓存在 core 层）
 */

import { BookNestError } from '@booknest/shared';
import { env } from '../config/env.js';

export interface FetchJsonOptions {
  /** 请求超时（毫秒）。默认 8000。 */
  timeoutMs?: number;
  /** 来自上层的 AbortSignal（例如总查询超时）。会和本地超时合并。 */
  signal?: AbortSignal;
  /** 用于日志/错误提示的 Provider 名。 */
  provider: string;
  /** 额外 HTTP headers（如商业 API 的认证头），会合并到默认 headers 上。 */
  headers?: Record<string, string>;
}

export async function fetchJson<T = unknown>(
  url: string,
  { timeoutMs = 8000, signal, provider, headers: extraHeaders }: FetchJsonOptions,
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error('timeout')), timeoutMs);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const ua = env.APP_CONTACT_EMAIL
      ? `${env.APP_USER_AGENT} (mailto:${env.APP_CONTACT_EMAIL})`
      : env.APP_USER_AGENT;
    const res = await fetch(url, {
      headers: {
        'user-agent': ua,
        accept: 'application/json',
        ...extraHeaders,
      },
      signal: ctrl.signal,
    });

    if (res.status === 404) {
      // 404 视为"无结果"，由调用方决定要不要 throw
      throw new BookNestError('NOT_FOUND', `${provider} returned 404 for ${url}`, 404);
    }
    if (res.status === 429) {
      throw new BookNestError('RATE_LIMITED', `${provider} rate limited`, 429);
    }
    if (!res.ok) {
      throw new BookNestError(
        'PROVIDER_HTTP_ERROR',
        `${provider} HTTP ${res.status} for ${url}`,
        502,
      );
    }
    return (await res.json()) as T;
  } catch (e) {
    if (e instanceof BookNestError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new BookNestError('PROVIDER_TIMEOUT', `${provider} timed out`, 504);
    }
    throw new BookNestError(
      'PROVIDER_NETWORK_ERROR',
      `${provider} network error: ${(e as Error).message}`,
      502,
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}
