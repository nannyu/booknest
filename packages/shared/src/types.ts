/**
 * BookNest 跨包共享类型。
 *
 * 任何 Provider 实现都必须输出 BookCandidate。
 * core 引擎只消费 BookCandidate，不依赖具体 provider 类型。
 */

export type ContributorRole = 'author' | 'translator' | 'editor' | 'illustrator' | 'other';

export interface BookContributor {
  name: string;
  role: ContributorRole;
}

export type IdentifierType =
  | 'isbn10'
  | 'isbn13'
  | 'olid'
  | 'oclc'
  | 'lccn'
  | 'doi'
  | 'cip'
  | 'other';

export interface ExternalIdentifier {
  type: IdentifierType;
  value: string;
  source?: string;
}

/**
 * 各 Provider 把上游响应映射到这个统一结构。
 * core 层据此做合并、评分、入库。
 */
export interface BookCandidate {
  title: string;
  normalizedTitle?: string;
  subtitle?: string;
  authors: string[];
  translators?: string[];
  editors?: string[];
  publisher?: string;
  publishedDate?: string;
  isbn10?: string;
  isbn13?: string;
  language?: string;
  pageCount?: number;
  description?: string;
  coverUrl?: string;
  categories?: string[];
  identifiers?: ExternalIdentifier[];
  source: string;
  externalId?: string;
  externalUrl?: string;
  raw: unknown;
}

export type QueryType = 'isbn' | 'title' | 'title_author';

export interface SearchQuery {
  raw: string;
  queryType: QueryType;
  isbn?: string;
  title?: string;
  author?: string;
  publisher?: string;
  year?: number;
  language?: string;
  limit?: number;
}

export interface SearchTitleParams {
  title: string;
  author?: string;
  limit?: number;
  language?: string;
}

/**
 * Provider 必须实现的接口。
 *
 * 实现要求：
 * - 不要在这里访问数据库 / 缓存（caller 负责）
 * - 失败要 throw，不要静默返 []
 * - timeout 由 caller 用 AbortSignal 控制
 */
export interface BookProvider {
  readonly name: string;

  searchByISBN(isbn: string, signal?: AbortSignal): Promise<BookCandidate[]>;

  searchByTitle(params: SearchTitleParams, signal?: AbortSignal): Promise<BookCandidate[]>;
}

export type ProviderRiskLevel = 'low' | 'medium' | 'high';

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  priority: number;
  riskLevel: ProviderRiskLevel;
  supportsISBN: boolean;
  supportsTitleSearch: boolean;
  supportsCover: boolean;
  rateLimitPerMinute: number;
  cacheTtlDays: number;
  timeoutMs: number;
}

/**
 * 评分后的最终结果。HTTP 层直接返回这个结构。
 */
export interface RankedBook {
  id: string;
  workId?: string;
  title: string;
  subtitle?: string;
  authors: BookContributor[];
  publisher?: string;
  publishedDate?: string;
  isbn10?: string;
  isbn13?: string;
  language?: string;
  pageCount?: number;
  coverUrl?: string;
  description?: string;
  categories?: string[];
  confidence: number;
  recommended: boolean;
  needsReview: boolean;
  sources: Array<{ name: string; externalId?: string; externalUrl?: string }>;
}

/**
 * 业务错误。HTTP 层捕获后转 { error: { code, message } } 响应。
 */
export class BookNestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'BookNestError';
  }
}
