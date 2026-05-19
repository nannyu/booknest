/**
 * 候选评分。设计文档 §11.2 + queryType-aware 调整。
 *
 * 0-100 整数。queryType 决定哪个相似度因子是"主信号"，
 * 让对应字段的最高加分接近 ISBN 命中的 60 分基准：
 *   - isbn         → ISBN +60，title × 20，author × 10
 *   - title        → title × 50，author × 10
 *   - title_author → title × 30，author × 30
 *   - author       → author × 60，title × 10（通常 query.title 是 undefined）
 *
 * 通用辅助加分（publisher / year / cover）和惩罚（无 ISBN / 无标题）
 * 不受 queryType 影响。
 */

import type { BookCandidate, QueryType, SearchQuery } from '@booknest/shared';
import {
  authorSimilarity,
  nearYear,
  samePublisher,
  titleSimilarity,
} from '@booknest/shared';

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

export function scoreCandidate(candidate: BookCandidate, query: SearchQuery): number {
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

  if (candidate.coverUrl) score += 3;
  if (!candidate.isbn10 && !candidate.isbn13) score -= 20;
  if (!candidate.title) score -= 50;

  return Math.max(0, Math.min(100, Math.round(score)));
}
