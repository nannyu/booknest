/**
 * Provider 静态配置 + 已启用 Provider 实例工厂。
 *
 * - 每个 Provider 的 enabled / priority / rate / cacheTTL 集中在这里
 * - core 层通过 getEnabledProviders() 拿可用 Provider 列表
 * - 默认只启用 Open Library + Google Books
 *
 * 红线：不要为豆瓣/京东/当当/淘宝/微信读书等商业平台加配置。
 */

import type { BookProvider, ProviderConfig } from '@booknest/shared';
import { CommercialIsbnProvider } from '../providers/commercial-isbn/index.js';
import { CrossrefProvider } from '../providers/crossref/index.js';
import { GoogleBooksProvider } from '../providers/google-books/index.js';
import { LOCProvider } from '../providers/loc/index.js';
import { OpenLibraryProvider } from '../providers/open-library/index.js';
import { env } from './env.js';

export const providerConfigs: Record<string, ProviderConfig> = {
  open_library: {
    name: 'open_library',
    enabled: env.ENABLE_OPEN_LIBRARY,
    priority: 40,
    riskLevel: 'low',
    supportsISBN: true,
    supportsTitleSearch: true,
    supportsCover: true,
    rateLimitPerMinute: 60,
    cacheTtlDays: 90,
    timeoutMs: 8000,
  },
  google_books: {
    name: 'google_books',
    enabled: env.ENABLE_GOOGLE_BOOKS,
    priority: 50,
    riskLevel: 'low',
    supportsISBN: true,
    supportsTitleSearch: true,
    supportsCover: true,
    rateLimitPerMinute: 60,
    cacheTtlDays: 30,
    timeoutMs: 8000,
  },
  crossref: {
    name: 'crossref',
    enabled: env.ENABLE_CROSSREF,
    priority: 30,
    riskLevel: 'low',
    supportsISBN: true,
    supportsTitleSearch: true,
    supportsCover: false,
    rateLimitPerMinute: 60,
    cacheTtlDays: 90,
    timeoutMs: 8000,
  },
  loc: {
    name: 'loc',
    enabled: env.ENABLE_LOC,
    priority: 20,
    riskLevel: 'low',
    supportsISBN: true,
    supportsTitleSearch: true,
    supportsCover: true,
    rateLimitPerMinute: 60,
    cacheTtlDays: 90,
    timeoutMs: 8000,
  },
  commercial_isbn: {
    name: 'commercial_isbn',
    enabled: env.ENABLE_COMMERCIAL_ISBN,
    priority: 70,
    riskLevel: 'medium',
    supportsISBN: true,
    supportsTitleSearch: false,
    supportsCover: true,
    rateLimitPerMinute: 60,
    cacheTtlDays: 90,
    timeoutMs: 8000,
  },
};

const PROVIDER_FACTORIES: Record<string, () => BookProvider> = {
  open_library: () => new OpenLibraryProvider(),
  google_books: () => new GoogleBooksProvider(),
  crossref: () => new CrossrefProvider(),
  loc: () => new LOCProvider(),
  commercial_isbn: () => new CommercialIsbnProvider(),
};

const instances = new Map<string, BookProvider>();

export function getProvider(name: string): BookProvider {
  const cfg = providerConfigs[name];
  if (!cfg) throw new Error(`unknown provider: ${name}`);
  if (!cfg.enabled) throw new Error(`provider not enabled: ${name}`);
  let inst = instances.get(name);
  if (!inst) {
    const factory = PROVIDER_FACTORIES[name];
    if (!factory) throw new Error(`no factory for provider: ${name}`);
    inst = factory();
    instances.set(name, inst);
  }
  return inst;
}

export interface EnabledProvider {
  config: ProviderConfig;
  provider: BookProvider;
}

export function getEnabledProviders(): EnabledProvider[] {
  return Object.values(providerConfigs)
    .filter((c) => c.enabled)
    .sort((a, b) => b.priority - a.priority)
    .map((config) => ({ config, provider: getProvider(config.name) }));
}
