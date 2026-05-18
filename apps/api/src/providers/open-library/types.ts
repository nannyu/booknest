/**
 * Open Library 响应类型。
 * 文档：https://openlibrary.org/developers/api
 *
 * 我们用 search.json?q=isbn:xxx 而不是 /isbn/{isbn}.json，因为前者一次拿到 author_name；
 * 后者只返回 author key 还要二次 fetch。
 */

export interface OLSearchResponse {
  numFound: number;
  start: number;
  numFoundExact?: boolean;
  docs: OLSearchDoc[];
}

export interface OLSearchDoc {
  key: string; // /works/OL...W
  title?: string;
  subtitle?: string;
  title_suggest?: string;
  author_name?: string[];
  author_key?: string[];
  isbn?: string[];
  publisher?: string[];
  publish_date?: string[];
  publish_year?: number[];
  first_publish_year?: number;
  language?: string[]; // ISO 639-2 (e.g. "zho", "eng")
  cover_i?: number;
  cover_edition_key?: string;
  edition_key?: string[];
  number_of_pages_median?: number;
  first_sentence?: string[];
  subject?: string[];
  ia?: string[];
  ebook_access?: string;
}
