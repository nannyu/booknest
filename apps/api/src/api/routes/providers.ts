/**
 * Provider 状态查询。
 *   GET /api/providers
 *
 * 数据来源：provider_health 表 + 静态 providerConfigs。
 */

import { Hono } from 'hono';
import { providerConfigs } from '../../config/providers.js';
import { getDb } from '../../db/client.js';
import { providerHealth } from '../../db/schema.js';

const providers = new Hono();

providers.get('/', (c) => {
  const db = getDb();
  const rows = db.select().from(providerHealth).all();
  const byName = new Map(rows.map((r) => [r.name, r]));
  const list = Object.values(providerConfigs).map((cfg) => {
    const h = byName.get(cfg.name);
    return {
      name: cfg.name,
      enabled: cfg.enabled,
      priority: cfg.priority,
      riskLevel: cfg.riskLevel,
      rateLimitPerMinute: cfg.rateLimitPerMinute,
      cacheTtlDays: cfg.cacheTtlDays,
      circuitState: h?.circuitState ?? 'closed',
      failureCount: h?.failureCount ?? 0,
      lastSuccessAt: h?.lastSuccessAt ?? null,
      lastErrorAt: h?.lastErrorAt ?? null,
      lastErrorMessage: h?.lastErrorMessage ?? null,
    };
  });
  return c.json({ providers: list });
});

export default providers;
