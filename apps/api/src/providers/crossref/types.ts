/**
 * Crossref API 响应类型。
 * 文档：https://api.crossref.org/swagger-ui/index.html
 */

export interface CrossrefWorksResponse {
  status: string;
  'message-type': string;
  message: {
    'total-results': number;
    items: CrossrefWork[];
  };
}

export interface CrossrefWork {
  DOI?: string;
  title?: string[];
  author?: Array<{ given?: string; family?: string; name?: string; sequence?: string }>;
  publisher?: string;
  'published-print'?: { 'date-parts': number[][] };
  'published-online'?: { 'date-parts': number[][] };
  published?: { 'date-parts': number[][] };
  ISBN?: string[];
  type?: string;
  URL?: string;
  language?: string;
  page?: string;
  'container-title'?: string[];
  'is-referenced-by-count'?: number;
}
