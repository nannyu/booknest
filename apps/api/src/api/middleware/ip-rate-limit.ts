/**
 * 按客户端 IP 的简单滑动窗口限流（进程内，适合单实例部署）。
 */

import type { Context, Next } from 'hono';
import { BookNestError } from '@booknest/shared';

interface Window {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Window>();

export function ipRateLimit(maxPerMinute: number) {
  return async (c: Context, next: Next) => {
    const ip =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
      c.req.header('x-real-ip') ||
      'local';
    const now = Date.now();
    let w = buckets.get(ip);
    if (!w || now >= w.resetAt) {
      w = { count: 0, resetAt: now + 60_000 };
      buckets.set(ip, w);
    }
    w.count += 1;
    if (w.count > maxPerMinute) {
      throw new BookNestError('RATE_LIMITED', 'too many requests', 429);
    }
    await next();
  };
}
