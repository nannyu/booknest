/**
 * 熔断器。状态机：closed -> open -> half_open -> (closed|open)。
 *
 * - closed：正常调
 * - open：连续失败 >= FAILURE_THRESHOLD，停调 OPEN_DURATION_MS
 * - half_open：冷却结束，放一个探测请求；成功回 closed，失败回 open
 *
 * v0.1 in-memory + 写回 provider_health 表（供 /api/providers 读取）。
 * 多进程部署时需要重新设计为读表。
 */

import { getDb } from '../db/client.js';
import { providerHealth } from '../db/schema.js';

const FAILURE_THRESHOLD = 5;
const OPEN_DURATION_MS = 5 * 60 * 1000;

type CircuitState = 'closed' | 'open' | 'half_open';

interface Entry {
  state: CircuitState;
  failureCount: number;
  openedAt: number | null;
  nextRetryAt: number | null;
  lastSuccessAt: number | null;
  lastErrorAt: number | null;
  lastErrorMessage: string | null;
  probeSent: boolean; // half_open 并发锁
}

const entries = new Map<string, Entry>();

function get(provider: string): Entry {
  let e = entries.get(provider);
  if (!e) {
    e = {
      state: 'closed',
      failureCount: 0,
      openedAt: null,
      nextRetryAt: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      lastErrorMessage: null,
      probeSent: false,
    };
    entries.set(provider, e);
  }
  return e;
}

export function canCall(provider: string): boolean {
  const e = get(provider);
  if (e.state === 'closed') return true;
  if (e.state === 'open') {
    if (e.nextRetryAt && Date.now() >= e.nextRetryAt) {
      e.state = 'half_open';
      persist(provider, e);
      return true;
    }
    return false;
  }
  return e.probeSent ? false : (e.probeSent = true);
}

export function recordSuccess(provider: string): void {
  const e = get(provider);
  e.state = 'closed';
  e.failureCount = 0;
  e.openedAt = null;
  e.nextRetryAt = null;
  e.probeSent = false;
  e.lastSuccessAt = Date.now();
  persist(provider, e);
}

export function recordFailure(provider: string, message: string): void {
  const e = get(provider);
  e.failureCount += 1;
  e.lastErrorAt = Date.now();
  e.lastErrorMessage = message.slice(0, 500);
  if (e.failureCount >= FAILURE_THRESHOLD) {
    e.state = 'open';
    e.openedAt = Date.now();
    e.nextRetryAt = Date.now() + OPEN_DURATION_MS;
    e.probeSent = false;
  }
  persist(provider, e);
}

function isoOrNull(ms: number | null): string | null {
  return ms === null ? null : new Date(ms).toISOString();
}

function persist(provider: string, e: Entry): void {
  const db = getDb();
  const now = new Date().toISOString();
  const payload = {
    circuitState: e.state,
    failureCount: e.failureCount,
    openedAt: isoOrNull(e.openedAt),
    nextRetryAt: isoOrNull(e.nextRetryAt),
    lastSuccessAt: isoOrNull(e.lastSuccessAt),
    lastErrorAt: isoOrNull(e.lastErrorAt),
    lastErrorMessage: e.lastErrorMessage,
    updatedAt: now,
  };
  try {
    db.insert(providerHealth)
      .values({ name: provider, enabled: true, ...payload })
      .onConflictDoUpdate({ target: providerHealth.name, set: payload })
      .run();
  } catch (err) {
    // 持久化失败不影响业务流程
    // eslint-disable-next-line no-console
    console.warn(`[circuit-breaker] persist failed for ${provider}:`, (err as Error).message);
  }
}

export function getCircuitState(provider: string): CircuitState {
  return get(provider).state;
}

export function _resetAllForTests(): void {
  entries.clear();
}
