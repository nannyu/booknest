/**
 * Google Books API 响应类型。
 * 文档：https://developers.google.com/books/docs/v1/using
 */

export interface GBVolumesResponse {
  kind: string;
  totalItems: number;
  items?: GBVolume[];
}

export interface GBVolume {
  id: string;
  selfLink?: string;
  volumeInfo?: GBVolumeInfo;
}

export interface GBVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: Array<{
    type: 'ISBN_10' | 'ISBN_13' | 'OTHER' | 'ISSN';
    identifier: string;
  }>;
  pageCount?: number;
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  language?: string; // e.g. "zh-CN" or "en"
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    extraLarge?: string;
  };
  infoLink?: string;
  canonicalVolumeLink?: string;
}
