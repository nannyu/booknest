/**
 * Library of Congress API 响应类型。
 * 在任意 LOC 搜索 URL 后加 `?fo=json` 即可返 JSON。
 * 文档：https://www.loc.gov/apis/json-and-yaml/requests/endpoints/
 */

export interface LOCResponse {
  content?: {
    results?: LOCResult[];
  };
}

export interface LOCResult {
  title?: string;
  contributor?: string[];
  date?: string;
  dates?: string[];
  description?: string[];
  image_url?: string[];
  language?: string;
  id?: string;
  digitized?: boolean;
  item?: {
    title?: string;
    contributors?: string[];
    call_number?: string[];
    created_published?: string[];
    notes?: string[];
  };
}
