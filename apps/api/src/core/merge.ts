/**
 * 多源候选合并。设计文档 §11.1。
 *
 * 步骤：
 *   1. 按 ISBN-13（优先）/ ISBN-10 / normalizedTitle+author 分组
 *   2. 同组内按 FIELD_PRIORITY 表挑每个字段的最优来源
 *   3. 返回 MergedCandidate（每个对应一个 Edition）
 *
 * Work ≠ Edition：不同 ISBN 不合并，即使是同一本书的不同版本。
 */

import type { BookCandidate } from '@booknest/shared';
import { normalizeAuthorName, normalizeChineseTitle } from '@booknest/shared';

type Source = string;

/** 字段 → 来源优先级。靠前的源胜出。 */
const FIELD_PRIORITY: Record<string, Source[]> = {
  isbn: ['commercial_isbn', 'pdc', 'nlc_opac', 'calis', 'google_books', 'open_library', 'neodb', 'crossref', 'loc'],
  title: ['commercial_isbn', 'pdc', 'nlc_opac', 'calis', 'google_books', 'open_library', 'neodb', 'crossref', 'loc'],
  authors: ['commercial_isbn', 'pdc', 'nlc_opac', 'calis', 'neodb', 'google_books', 'open_library', 'crossref', 'loc'],
  publisher: ['commercial_isbn', 'pdc', 'nlc_opac', 'calis', 'neodb', 'google_books', 'open_library', 'crossref', 'loc'],
  publishedDate: ['commercial_isbn', 'pdc', 'nlc_opac', 'calis', 'neodb', 'google_books', 'open_library', 'crossref', 'loc'],
  categories: ['commercial_isbn', 'pdc', 'nlc_opac', 'calis', 'neodb', 'open_library', 'google_books', 'crossref', 'loc'],
  coverUrl: ['commercial_isbn', 'google_books', 'open_library', 'neodb', 'loc'],
  description: ['commercial_isbn', 'neodb', 'google_books', 'open_library', 'crossref', 'loc'],
};

export interface SourceMeta {
  name: string;
  externalId?: string;
  externalUrl?: string;
}

export interface MergedCandidate extends BookCandidate {
  sources: string[];
  sourceMeta: SourceMeta[];
}

function isPresent(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/** 无 ISBN 时的分组键：标题 + 作者 + 出版社 + 语言 + 首译者（避免误合并）。 */
export function groupKey(c: BookCandidate): string {
  if (c.isbn13) return `isbn13:${c.isbn13}`;
  if (c.isbn10) return `isbn10:${c.isbn10}`;
  const nt = normalizeChineseTitle(c.title);
  const author = c.authors[0] ? normalizeAuthorName(c.authors[0]) : '';
  const publisher = (c.publisher ?? '').toLowerCase().replace(/\s+/g, '');
  const language = (c.language ?? '').toLowerCase();
  const translator = c.translators?.[0] ? normalizeAuthorName(c.translators[0]) : '';
  return `t:${nt}|a:${author}|p:${publisher}|l:${language}|tr:${translator}`;
}

function pickField<K extends keyof BookCandidate>(
  group: BookCandidate[],
  field: K,
  priorityList: Source[] | undefined,
): BookCandidate[K] | undefined {
  if (priorityList) {
    for (const src of priorityList) {
      const hit = group.find((c) => c.source === src && isPresent(c[field]));
      if (hit) return hit[field];
    }
  }
  for (const c of group) {
    if (isPresent(c[field])) return c[field];
  }
  return undefined;
}

function pickFirstPresent<K extends keyof BookCandidate>(
  group: BookCandidate[],
  field: K,
): BookCandidate[K] | undefined {
  for (const c of group) {
    if (isPresent(c[field])) return c[field];
  }
  return undefined;
}

function mergeGroup(group: BookCandidate[]): MergedCandidate {
  const titlePri = FIELD_PRIORITY.title!;
  const sourcesSet = new Set(group.map((c) => c.source));
  const sources = titlePri.filter((s) => sourcesSet.has(s));
  for (const s of sourcesSet) if (!sources.includes(s)) sources.push(s);

  const base = group[0]!;
  const title = pickField(group, 'title', FIELD_PRIORITY.title) ?? base.title;
  const authors = pickField(group, 'authors', FIELD_PRIORITY.authors) ?? base.authors;
  const sourceMeta = group.map((c) => ({
    name: c.source,
    externalId: c.externalId,
    externalUrl: c.externalUrl,
  }));

  return {
    ...base,
    title,
    subtitle: pickField(group, 'subtitle', FIELD_PRIORITY.title),
    authors,
    translators: pickField(group, 'translators', FIELD_PRIORITY.authors),
    editors: pickField(group, 'editors', FIELD_PRIORITY.authors),
    publisher: pickField(group, 'publisher', FIELD_PRIORITY.publisher),
    publishedDate: pickField(group, 'publishedDate', FIELD_PRIORITY.publishedDate),
    isbn10: pickField(group, 'isbn10', FIELD_PRIORITY.isbn),
    isbn13: pickField(group, 'isbn13', FIELD_PRIORITY.isbn),
    language: pickField(group, 'language', undefined),
    pageCount: pickField(group, 'pageCount', undefined),
    description: pickField(group, 'description', FIELD_PRIORITY.description),
    coverUrl: pickField(group, 'coverUrl', FIELD_PRIORITY.coverUrl),
    categories: pickField(group, 'categories', FIELD_PRIORITY.categories),
    identifiers: group.flatMap((c) => c.identifiers ?? []),
    source: sources.join('+'),
    externalId: pickFirstPresent(group, 'externalId') ?? base.externalId,
    externalUrl: pickFirstPresent(group, 'externalUrl') ?? base.externalUrl,
    raw: group.map((c) => ({ source: c.source, raw: c.raw })),
    sources,
    sourceMeta,
  };
}

export function mergeCandidates(candidates: BookCandidate[]): MergedCandidate[] {
  const groups = new Map<string, BookCandidate[]>();
  for (const c of candidates) {
    const k = groupKey(c);
    const arr = groups.get(k);
    if (arr) arr.push(c);
    else groups.set(k, [c]);
  }
  return Array.from(groups.values()).map(mergeGroup);
}
