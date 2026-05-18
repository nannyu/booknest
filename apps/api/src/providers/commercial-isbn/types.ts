/**
 * 通用商业 ISBN Provider 的响应类型。
 *
 * 当前内置两个 preset：
 *   - isbndb     (https://isbndb.com/) — Authorization header
 *   - api_ninjas (https://api.api-ninjas.com/api/isbn) — X-Api-Key header
 *
 * 如要接入其他商业服务，扩展 PRESETS 即可。
 */

export interface ISBNdbResponse {
  book?: {
    title?: string;
    title_long?: string;
    isbn?: string;
    isbn13?: string;
    authors?: string[];
    publisher?: string;
    language?: string;
    date_published?: string;
    pages?: number;
    image?: string;
    subjects?: string[];
    synopsis?: string;
    edition?: string;
    binding?: string;
  };
}

/** API Ninjas /v1/isbn 返回一个数组，每项是一本书 */
export type ApiNinjasResponse = Array<{
  title?: string;
  authors?: string[];
  author?: string;
  publisher?: string;
  year?: number;
  isbn_10?: string;
  isbn_13?: string;
  binding?: string;
}>;

export type CommercialPresetName = 'isbndb' | 'api_ninjas';
