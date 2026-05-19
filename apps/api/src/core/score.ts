/**
 * 候选评分。queryType-aware + 多源共识 + 数据完整度。
 *
 * 0-100 整数。
 *
 * 三大模块：
 *   1. ISBN 命中 +60（query 提供且匹配）
 *   2. queryType-aware 相似度：
 *      - isbn         → title × 20, author × 10
 *      - title        → title × 50, author × 10
 *      - title_author → title × 30, author × 30
 *      - author       → author × 60, title × 10
 *   3. 多源共识（distinct sources 数）
 *      - 1 源：0
 *      - 2 源：+10
 *      - 3 源：+15
 *      - 4+ 源：+20
 *   4. 数据完整度：
 *      - authors / publisher / publishedDate / description 各 +3
 *      - pageCount / language / categories 各 +2
 *      - coverUrl +3
 *
 * 惩罚：
 *   - 无 ISBN：-20
 *   - 无标题：-50（理论上不会出现，mapper 已保证）
 *
 * 阈值（在 router.ts 的 toRanked / applyReturnPolicy 使用）：
 *   ≥ 80    高可信，标记 recommended
 *   60-79   合理候选，无 badge
 *   < 60    标记 needsReview
 */

import type { QueryType, SearchQuery } from '@booknest/shared';
import {
  authorSimilarity,
  nearYear,
  samePublisher,
  titleSimilarity,
} from '@booknest/shared';
import type { MergedCandidate } from './merge.js';

interface SimilarityWeights {
  title: number;
  author: number;
}

const SIMILARITY_WEIGHTS: Record<QueryType, SimilarityWeights> = {
  isbn: { title: 20, author: 10 },
  title: { title: 50, author: 10 },
  title_author: { title: 30, author: 30 },
  author: { title: 10, author: 60 },
};

function sourceConsensusBonus(distinctSources: number): number {
  if (distinctSources <= 1) return 0;
  if (distinctSources === 2) return 10;
  if (distinctSources === 3) return 15;
  return 20;
}

function fieldCompletenessBonus(c: MergedCandidate): number {
  let bonus = 0;
  if (c.authors && c.authors.length > 0) bonus += 3;
  if (c.publisher) bonus += 3;
  if (c.publishedDate) bonus += 3;
  if (c.description) bonus += 3;
  if (c.pageCount) bonus += 2;
  if (c.language) bonus += 2;
  if (c.categories && c.categories.length > 0) bonus += 2;
  return bonus;
}

export function scoreCandidate(candidate: MergedCandidate, query: SearchQuery): number {
  let score = 0;

  if (
    query.isbn &&
    (candidate.isbn10 === query.isbn || candidate.isbn13 === query.isbn)
  ) {
    score += 60;
  }

  const w = SIMILARITY_WEIGHTS[query.queryType];
  score += titleSimilarity(query.title, candidate.title) * w.title;
  score += authorSimilarity(query.author, candidate.authors) * w.author;

  if (
    candidate.publisher &&
    query.publisher &&
    samePublisher(query.publisher, candidate.publisher)
  ) {
    score += 5;
  }
  if (
    candidate.publishedDate &&
    query.year &&
    nearYear(candidate.publishedDate, query.year)
  ) {
    score += 5;
  }

  score += sourceConsensusBonus(candidate.sources?.length ?? 1);
  score += fieldCompletenessBonus(candidate);

  if (candidate.coverUrl) score += 3;
  if (!candidate.isbn10 && !candidate.isbn13) score -= 20;
  if (!candidate.title) score -= 50;

  return Math.max(0, Math.min(100, Math.round(score)));
}
