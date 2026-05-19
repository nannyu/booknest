/**
 * NeoDB API 响应类型。
 * 文档：https://neodb.net/api/  + 源码 catalog/apis.py / catalog/models/{book,item}.py
 *
 * 调用：
 *   GET /api/catalog/search?query={q}&category=book&page={n}
 * 公开 endpoint，不需要 OAuth（auth=None）。
 */

export interface NeoDBSearchResult {
  data: NeoDBEdition[];
  pages: number;
  count: number;
}

/**
 * EditionSchema = ItemInSchema + EditionInSchema + isbn。
 * 字段名严格对应 NeoDB 源码（display_title 已 alias 为 title 等）。
 */
export interface NeoDBEdition {
  // ItemInSchema
  type: string;
  title: string;
  description: string;
  cover_image_url?: string | null;
  rating?: number | null;
  rating_count?: number | null;
  tags?: string[] | null;
  brief?: string; // deprecated alias of description

  // BaseSchema
  id?: string;
  uuid?: string;
  url?: string;
  api_url?: string;
  category?: string;

  // EditionInSchema
  subtitle?: string | null;
  orig_title?: string | null;
  author?: string[];
  translator?: string[];
  language?: string[];
  publisher?: string[];
  pub_year?: number | null;
  pub_month?: number | null;
  binding?: string | null;
  pages?: number | string | null;
  series?: string | null;
  imprint?: string | null;

  // Edition-specific
  isbn?: string | null;
}
