/**
 * Provider 限流（in-memory token bucket）。
 * v0.1 单进程；多进程部署时换 Redis 实现。
 *
 * tryAcquire(name) 立即返回 true/false，不阻塞等待 token——
 * 上层（router）决定跳过该源还是排队。
 */

interface Bucket {
  capacity: number;
  tokens: number;
  refillPerMs: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

export function configureRateLimit(provider: string, perMinute: number): void {
  buckets.set(provider, {
    capacity: perMinute,
    tokens: perMinute,
    refillPerMs: perMinute / 60_000,
    lastRefill: Date.now(),
  });
}

export function ensureConfigured(provider: string, perMinute: number): void {
  if (!buckets.has(provider)) configureRateLimit(provider, perMinute);
}

export function tryAcquire(provider: string): boolean {
  const b = buckets.get(provider);
  if (!b) return true; // 没配置默认放行
  const now = Date.now();
  const elapsed = now - b.lastRefill;
  b.tokens = Math.min(b.capacity, b.tokens + elapsed * b.refillPerMs);
  b.lastRefill = now;
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return true;
  }
  return false;
}

export function _clearAllForTests(): void {
  buckets.clear();
}
