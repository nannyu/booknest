/**
 * 从 DB 读取 Edition 并组装成 RankedBook（供详情页 API 返回）。
 */

import { eq } from 'drizzle-orm';
import type { ContributorRole, RankedBook } from '@booknest/shared';
import { getDb } from '../db/client.js';
import { contributors, editionContributors, editions, externalIdentifiers } from '../db/schema.js';

const VALID_ROLES: readonly ContributorRole[] = ['author', 'translator', 'editor', 'illustrator', 'other'];

function toRole(s: string): ContributorRole {
  return (VALID_ROLES as readonly string[]).includes(s) ? (s as ContributorRole) : 'other';
}

export function loadEditionAsRankedBook(id: string): RankedBook | null {
  const db = getDb();
  const ed = db.select().from(editions).where(eq(editions.id, id)).get();
  if (!ed) return null;

  const contribs = db
    .select({
      name: contributors.name,
      role: editionContributors.role,
      position: editionContributors.position,
    })
    .from(editionContributors)
    .innerJoin(contributors, eq(editionContributors.contributorId, contributors.id))
    .where(eq(editionContributors.editionId, id))
    .orderBy(editionContributors.position)
    .all();

  const srcRows = db
    .selectDistinct({ source: externalIdentifiers.source })
    .from(externalIdentifiers)
    .where(eq(externalIdentifiers.editionId, id))
    .all();

  return {
    id: ed.id,
    workId: ed.workId ?? undefined,
    title: ed.title,
    subtitle: ed.subtitle ?? undefined,
    authors: contribs.map((c) => ({ name: c.name, role: toRole(c.role) })),
    publisher: ed.publisher ?? undefined,
    publishedDate: ed.publishedDate ?? undefined,
    isbn10: ed.isbn10 ?? undefined,
    isbn13: ed.isbn13 ?? undefined,
    language: ed.language ?? undefined,
    pageCount: ed.pageCount ?? undefined,
    coverUrl: ed.coverUrl ?? undefined,
    description: ed.description ?? undefined,
    categories: (ed.categories as string[] | null) ?? undefined,
    confidence: ed.confidence,
    recommended: false,
    needsReview: ed.needsReview,
    sources: srcRows.map((s) => ({ name: s.source })),
  };
}
