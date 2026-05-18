/**
 * 候选评分。设计文档 §11.2。
 *
 * 返回 0-100 整数：
 *   > 90    高置信度 ISBN 命中
 *   70-90   合理候选
 *   < 70    建议人工核对
 */

import type { BookCandidate, SearchQuery } from '@booknest/shared';
import {
  authorSimilarity,
  nearYear,
  samePublisher,
  titleSimilarity,
} from '@booknest/shared';

export function scoreCandidate(candidate: BookCandidate, query: SearchQuery): number {
  let score = 0;

  if (
    query.isbn &&
    (candidate.isbn10 === query.isbn || candidate.isbn13 === query.isbn)
  ) {
    score += 60;
  }

  score += titleSimilarity(query.title, candidate.title) * 20;
  score += authorSimilarity(query.author, candidate.authors) * 10;

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
