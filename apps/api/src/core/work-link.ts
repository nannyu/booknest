/**
 * Work 关联：同 normalizedTitle + 第一作者 → 复用已有 Work（不同 ISBN 仍为不同 Edition）。
 */

import { and, eq } from 'drizzle-orm';
import { normalizeAuthorName } from '@booknest/shared';
import {
  contributors,
  editionContributors,
  editions,
  works,
} from '../db/schema.js';
import type { MergedCandidate } from './merge.js';

type Tx = Parameters<Parameters<ReturnType<typeof import('../db/client.js').getDb>['transaction']>[0]>[0];

export function findWorkForCandidate(
  tx: Tx,
  normalizedTitle: string,
  candidate: MergedCandidate,
): string | null {
  const primaryAuthor = candidate.authors[0] ? normalizeAuthorName(candidate.authors[0]) : '';
  if (!normalizedTitle || !primaryAuthor) return null;

  const candidates = tx
    .select({ id: works.id })
    .from(works)
    .where(eq(works.normalizedTitle, normalizedTitle))
    .all();

  for (const w of candidates) {
    const linked = tx
      .select({ workId: editions.workId })
      .from(editions)
      .innerJoin(editionContributors, eq(editionContributors.editionId, editions.id))
      .innerJoin(contributors, eq(editionContributors.contributorId, contributors.id))
      .where(
        and(
          eq(editions.workId, w.id),
          eq(editionContributors.role, 'author'),
          eq(contributors.normalizedName, primaryAuthor),
        ),
      )
      .get();
    if (linked) return w.id;
  }

  return null;
}
