/**
 * 合并候选 → DB 持久化（works / editions / contributors / external_identifiers）。
 *
 * v0.1 简化策略：
 * - 每个 Edition 1:1 创建一个 Work（v0.2 再做真正的 work 聚类）
 * - 按 ISBN-13、ISBN-10 顺序匹配已有 Edition；无则插入
 * - 字段直接覆盖（candidate 总是当前合并的最新结果）
 * - external_identifiers 只记 `source` 维度（v0.2 再保留每源的 externalId）
 *
 * 持久化失败不影响搜索返回——上层用 try-catch 包裹。
 */

import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { normalizeAuthorName, normalizeChineseTitle } from '@booknest/shared';
import { getDb } from '../db/client.js';
import {
  contributors,
  editionContributors,
  editions,
  externalIdentifiers,
  works,
} from '../db/schema.js';
import type { MergedCandidate } from './merge.js';

export function persistMergedCandidate(candidate: MergedCandidate, confidence: number): string {
  const db = getDb();

  return db.transaction((tx) => {
    let existing = candidate.isbn13
      ? tx.select().from(editions).where(eq(editions.isbn13, candidate.isbn13)).get() ?? null
      : null;
    if (!existing && candidate.isbn10) {
      existing = tx.select().from(editions).where(eq(editions.isbn10, candidate.isbn10)).get() ?? null;
    }

    const normalizedTitle = normalizeChineseTitle(candidate.title);
    const now = new Date().toISOString();

    let editionId: string;
    let workId: string;

    if (existing) {
      editionId = existing.id;
      workId = existing.workId ?? createWork(tx, candidate, normalizedTitle);
      tx.update(editions)
        .set({
          workId,
          title: candidate.title,
          normalizedTitle,
          subtitle: candidate.subtitle,
          publisher: candidate.publisher,
          publishedDate: candidate.publishedDate,
          isbn10: candidate.isbn10,
          isbn13: candidate.isbn13,
          pageCount: candidate.pageCount,
          language: candidate.language,
          coverUrl: candidate.coverUrl,
          description: candidate.description,
          categories: candidate.categories ?? null,
          confidence: Math.max(confidence, existing.confidence),
          needsReview: confidence < 70,
          updatedAt: now,
        })
        .where(eq(editions.id, editionId))
        .run();
    } else {
      workId = createWork(tx, candidate, normalizedTitle);
      editionId = nanoid();
      tx.insert(editions)
        .values({
          id: editionId,
          workId,
          title: candidate.title,
          normalizedTitle,
          subtitle: candidate.subtitle,
          publisher: candidate.publisher,
          publishedDate: candidate.publishedDate,
          isbn10: candidate.isbn10,
          isbn13: candidate.isbn13,
          pageCount: candidate.pageCount,
          language: candidate.language,
          coverUrl: candidate.coverUrl,
          description: candidate.description,
          categories: candidate.categories ?? null,
          confidence,
          needsReview: confidence < 70,
        })
        .run();
    }

    // 作者 & edition_contributors（位置保留，role 暂时全为 author）
    for (let i = 0; i < candidate.authors.length; i++) {
      const name = candidate.authors[i]!;
      const normalizedName = normalizeAuthorName(name);
      if (!normalizedName) continue;
      let contrib = tx
        .select()
        .from(contributors)
        .where(eq(contributors.normalizedName, normalizedName))
        .get();
      if (!contrib) {
        const contribId = nanoid();
        tx.insert(contributors).values({ id: contribId, name, normalizedName }).run();
        contrib = { id: contribId } as typeof contributors.$inferSelect;
      }
      tx.insert(editionContributors)
        .values({
          editionId,
          contributorId: contrib.id,
          role: 'author',
          position: i,
        })
        .onConflictDoNothing()
        .run();
    }

    // sources（per source 一行，distinct 即可推 sources 列表）
    for (const sourceName of candidate.sources) {
      tx.insert(externalIdentifiers)
        .values({
          id: nanoid(),
          editionId,
          source: sourceName,
          identifierType: 'source',
          identifierValue: sourceName,
        })
        .onConflictDoNothing()
        .run();
    }

    return editionId;
  });
}

function createWork(
  tx: Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0],
  candidate: MergedCandidate,
  normalizedTitle: string,
): string {
  const workId = nanoid();
  tx.insert(works)
    .values({
      id: workId,
      canonicalTitle: candidate.title,
      normalizedTitle,
      subtitle: candidate.subtitle,
      description: candidate.description,
      language: candidate.language,
    })
    .run();
  return workId;
}
