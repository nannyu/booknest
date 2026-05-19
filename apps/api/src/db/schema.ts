/**
 * BookNest 数据库 schema (SQLite + Drizzle ORM)。
 * 设计文档 §8。
 *
 * 命名约定：
 * - 表名：复数小写下划线
 * - 主键 id：text，使用 nanoid 生成
 * - 时间戳：text(ISO-8601)，由 default('CURRENT_TIMESTAMP') 写入
 */

import { sql } from 'drizzle-orm';
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';

/** 作品概念（Work）。同一作品的不同 Edition 共享 work_id。 */
export const works = sqliteTable(
  'works',
  {
    id: text('id').primaryKey(),
    canonicalTitle: text('canonical_title').notNull(),
    normalizedTitle: text('normalized_title').notNull(),
    subtitle: text('subtitle'),
    description: text('description'),
    language: text('language'),
    createdAt: text('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text('updated_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => ({
    normalizedTitleIdx: index('idx_works_normalized_title').on(t.normalizedTitle),
  }),
);

/** 具体版本（Edition）。ISBN 是 Edition 级别的唯一标识。 */
export const editions = sqliteTable(
  'editions',
  {
    id: text('id').primaryKey(),
    workId: text('work_id').references(() => works.id),
    title: text('title').notNull(),
    normalizedTitle: text('normalized_title').notNull(),
    subtitle: text('subtitle'),
    publisher: text('publisher'),
    publishedDate: text('published_date'),
    isbn10: text('isbn10'),
    isbn13: text('isbn13'),
    pageCount: integer('page_count'),
    language: text('language'),
    coverUrl: text('cover_url'),
    description: text('description'),
    categories: text('categories', { mode: 'json' }).$type<string[]>(),
    confidence: integer('confidence').notNull().default(0),
    needsReview: integer('needs_review', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text('updated_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => ({
    isbn13Idx: uniqueIndex('idx_editions_isbn13')
      .on(t.isbn13)
      .where(sql`${t.isbn13} IS NOT NULL`),
    isbn10Idx: uniqueIndex('idx_editions_isbn10')
      .on(t.isbn10)
      .where(sql`${t.isbn10} IS NOT NULL`),
    titleIdx: index('idx_editions_normalized_title').on(t.normalizedTitle),
    workIdx: index('idx_editions_work_id').on(t.workId),
  }),
);

/** 贡献者（作者、译者、编者、绘者）。 */
export const contributors = sqliteTable(
  'contributors',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    normalizedName: text('normalized_name').notNull(),
    originalScript: text('original_script'),
    createdAt: text('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => ({
    normalizedNameUniq: uniqueIndex('uniq_contributors_normalized_name').on(t.normalizedName),
  }),
);

/** Edition 命中的数据源（与 external_identifiers 中的 OLID/ISBN 等区分）。 */
export const editionSources = sqliteTable(
  'edition_sources',
  {
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id),
    source: text('source').notNull(),
    externalId: text('external_id'),
    externalUrl: text('external_url'),
    createdAt: text('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.editionId, t.source] }),
    editionIdx: index('idx_edition_sources_edition').on(t.editionId),
  }),
);

/** Edition ↔ Contributor 多对多。 */
export const editionContributors = sqliteTable(
  'edition_contributors',
  {
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id),
    contributorId: text('contributor_id')
      .notNull()
      .references(() => contributors.id),
    role: text('role').notNull().default('author'),
    position: integer('position').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.editionId, t.contributorId, t.role] }),
    editionIdx: index('idx_edition_contributors_edition').on(t.editionId),
  }),
);

/** ISBN/OLID/OCLC/LCCN/DOI/CIP 等外部标识。 */
export const externalIdentifiers = sqliteTable(
  'external_identifiers',
  {
    id: text('id').primaryKey(),
    editionId: text('edition_id').references(() => editions.id),
    workId: text('work_id').references(() => works.id),
    source: text('source').notNull(),
    identifierType: text('identifier_type').notNull(),
    identifierValue: text('identifier_value').notNull(),
    externalUrl: text('external_url'),
    createdAt: text('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => ({
    uniq: uniqueIndex('uniq_external_identifiers').on(
      t.source,
      t.identifierType,
      t.identifierValue,
    ),
    editionIdx: index('idx_external_identifiers_edition').on(t.editionId),
  }),
);

/** Provider 原始响应快照。用于追溯、重新合并、debug。 */
export const sourceSnapshots = sqliteTable(
  'source_snapshots',
  {
    id: text('id').primaryKey(),
    source: text('source').notNull(),
    query: text('query').notNull(),
    queryType: text('query_type').notNull(),
    responseJson: text('response_json', { mode: 'json' }).notNull(),
    fetchedAt: text('fetched_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => ({
    sourceIdx: index('idx_source_snapshots_source').on(t.source),
    queryIdx: index('idx_source_snapshots_query').on(t.query),
  }),
);

/** 搜索缓存：key = sha256(provider + queryType + query + language)。 */
export const searchCache = sqliteTable(
  'search_cache',
  {
    cacheKey: text('cache_key').primaryKey(),
    query: text('query').notNull(),
    queryType: text('query_type').notNull(),
    resultJson: text('result_json', { mode: 'json' }).notNull(),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => ({
    expiresIdx: index('idx_search_cache_expires_at').on(t.expiresAt),
  }),
);

/** 人工修正历史。 */
export const corrections = sqliteTable('corrections', {
  id: text('id').primaryKey(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  fieldName: text('field_name').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value').notNull(),
  source: text('source').notNull().default('user'),
  note: text('note'),
  status: text('status').notNull().default('pending'),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  reviewedAt: text('reviewed_at'),
});

/** 封面元数据。封面字节流默认不缓存，存远程 URL；v0.2+ 可加本地 / S3。 */
export const covers = sqliteTable(
  'covers',
  {
    id: text('id').primaryKey(),
    editionId: text('edition_id')
      .notNull()
      .references(() => editions.id),
    source: text('source').notNull(),
    remoteUrl: text('remote_url'),
    localUrl: text('local_url'),
    width: integer('width'),
    height: integer('height'),
    license: text('license'),
    createdAt: text('created_at')
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => ({
    editionIdx: index('idx_covers_edition').on(t.editionId),
  }),
);

/** Provider 健康状态。运行时上报，供 /api/providers/status 读取。 */
export const providerHealth = sqliteTable('provider_health', {
  name: text('name').primaryKey(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  circuitState: text('circuit_state').notNull().default('closed'),
  failureCount: integer('failure_count').notNull().default(0),
  openedAt: text('opened_at'),
  nextRetryAt: text('next_retry_at'),
  lastSuccessAt: text('last_success_at'),
  lastErrorAt: text('last_error_at'),
  lastErrorMessage: text('last_error_message'),
  updatedAt: text('updated_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Work = typeof works.$inferSelect;
export type NewWork = typeof works.$inferInsert;
export type Edition = typeof editions.$inferSelect;
export type NewEdition = typeof editions.$inferInsert;
export type Contributor = typeof contributors.$inferSelect;
export type NewContributor = typeof contributors.$inferInsert;
export type SearchCacheRow = typeof searchCache.$inferSelect;
export type NewSearchCacheRow = typeof searchCache.$inferInsert;
export type SourceSnapshotRow = typeof sourceSnapshots.$inferSelect;
export type NewSourceSnapshot = typeof sourceSnapshots.$inferInsert;
export type CorrectionRow = typeof corrections.$inferSelect;
export type NewCorrection = typeof corrections.$inferInsert;
export type CoverRow = typeof covers.$inferSelect;
export type EditionSourceRow = typeof editionSources.$inferSelect;
export type ProviderHealthRow = typeof providerHealth.$inferSelect;
