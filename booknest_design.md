# BookNest：开放图书元数据聚合服务设计文档

> 版本：v0.1  
> 日期：2026-05-18  
> 定位：面向公开项目的图书元数据聚合服务，支持输入书名 / ISBN，自动匹配封面和书籍信息。

---

## 1. 项目命名

### 1.1 推荐项目名

**BookNest**

含义：

- `Book`：直接表达图书场景。
- `Nest`：表达聚合、收纳、沉淀、整理。
- 名字短，适合作为 GitHub repo、npm package、Docker image、API service 名称。
- 不绑定某个数据源，后续可扩展到图书馆、读书记录、书架管理、AI 推荐等场景。

推荐仓库名：

```text
booknest
booknest-api
booknest-metadata
```

推荐一句话介绍：

```text
BookNest is an open-source book metadata aggregation service for ISBN and title search.
```

中文介绍：

```text
BookNest 是一个开源图书元数据聚合服务，支持通过 ISBN 或书名检索图书信息、封面、作者、出版社和版本数据。
```

### 1.2 备选项目名

| 名称 | 判断 |
|---|---|
| **BookNest** | 推荐，通用、短、扩展性好 |
| **OpenBookMeta** | 描述最准确，但偏工具化 |
| **BookMosaic** | 表达多源聚合，但稍抽象 |
| **ISBNHub** | 适合 ISBN 服务，但限制了书名搜索和作品层能力 |
| **BiblioBridge** | 图书馆感强，适合偏学术和书目系统 |
| **PageAnchor** | 更像阅读产品，不够直接 |
| **BookAtlas** | 适合做图书知识图谱，但容易和地图概念混淆 |

最终建议：**BookNest**。

---

## 2. 项目目标

### 2.1 要解决的问题

用户输入：

```text
书名 / ISBN / 作者 + 书名
```

系统返回：

```text
书名、作者、译者、出版社、出版日期、ISBN、语言、页数、简介、封面、版本信息、数据来源、置信度
```

核心问题不是“调用某个 API 查一本书”，而是：

1. 免费公开数据源不完整。
2. 中文书籍数据源碎片化。
3. 同名书、不同版、不同译者、套装书容易混淆。
4. 封面和简介经常缺失。
5. 公共 API 有限流和服务不稳定风险。
6. 公开项目不能依赖非授权爬虫。

因此，BookNest 的设计目标是：

```text
多源聚合 + 本地缓存 + 字段级合并 + 候选结果排序 + 用户确认沉淀
```

### 2.2 非目标

v0.1 不做：

- 豆瓣、京东、当当、微信读书等商业站点抓取。
- 大规模盗链封面。
- 保证所有中文书 100% 命中。
- 把书名搜索结果强行自动归一成唯一一本书。
- 电子书下载、全文阅读、版权内容分发。

---

## 3. 产品定位

### 3.1 目标用户

| 用户 | 需求 |
|---|---|
| 个人开发者 | 给读书 App / 书架工具 / 笔记系统补全图书信息 |
| 开源项目维护者 | 需要一个稳定、免费、可自部署的书籍元数据服务 |
| 图书管理工具 | 通过 ISBN 扫码自动补全书籍资料 |
| AI Agent / MCP 工具 | 根据用户输入的书名获取结构化元数据 |
| 研究 / 资料整理用户 | 搜索书目、版本、作者、出版社信息 |

### 3.2 产品承诺

合理承诺：

```text
输入 ISBN 或书名，BookNest 聚合多个公开数据源，返回候选结果，并通过本地缓存和用户确认不断提升数据质量。
```

不承诺：

```text
输入任意书名都能唯一、准确、完整地匹配一本书。
```

---

## 4. 数据源策略

### 4.1 默认稳定数据源

| Provider | 用途 | 默认启用 | 说明 |
|---|---:|---:|---|
| Open Library | 主数据源、ISBN、封面、dump | 是 | 免费开放，有 API 和批量数据 |
| Google Books | 搜索召回、封面、简介 | 是 | 搜索能力较好，适合补充 |
| Crossref | 学术书、章节、DOI | 可选 | 学术出版物元数据 |
| Library of Congress | 英文书、馆藏、LCCN | 可选 | 权威英文馆藏数据 |

### 4.2 中文增强数据源

| Provider | 用途 | 默认启用 | 说明 |
|---|---:|---:|---|
| PDC / 国家版本数据中心 | 中文出版物权威校验 | 否 | 权威性强，但自动化友好度低 |
| 中国国家图书馆 OPAC | 中文馆藏书目 | 否 | 可低频查询，适合 ISBN / 明确书名 |
| CALIS 联合目录 | 高校图书馆联合书目 | 否 | 中文学术书、教材、古籍价值高 |
| UCDRS / 全国图书馆参考咨询联盟 | 文献元数据辅助 | 否 | 不进入默认自动链路 |

### 4.3 不建议加入默认链路的数据源

| 数据源 | 原因 |
|---|---|
| 豆瓣非官方接口 | 不稳定，合规风险高 |
| 京东 / 当当 / 淘宝 | 商品页，不是开放书目源；反爬和授权风险高 |
| 微信读书 | 平台封闭，公开项目不适合依赖 |
| 个人维护 ISBN API | 可参考，不适合作为长期基础依赖 |
| ISBNdb | 数据服务偏商业化，长期免费不确定 |

---

## 5. 总体架构

```text
Client
  ↓
API Gateway
  ↓
Input Normalizer
  ↓
Search Router
  ↓
Local Cache / Local DB
  ↓ miss
Provider Orchestrator
  ├─ Open Library Provider
  ├─ Google Books Provider
  ├─ Crossref Provider
  ├─ Library of Congress Provider
  ├─ NLC OPAC Provider, optional
  ├─ CALIS Provider, optional
  └─ PDC Provider, manual / low-frequency
  ↓
Candidate Mapper
  ↓
Merge Engine
  ↓
Ranking Engine
  ↓
Persistence Layer
  ↓
API Response
```

### 5.1 关键设计原则

1. **先查本地，再查外部。** 保护免费 API，降低延迟。
2. **ISBN 精确优先。** ISBN 是版本级标识，可信度最高。
3. **书名搜索返回候选。** 书名天然有歧义，不应默认唯一匹配。
4. **字段级合并。** 不同来源在不同字段上可信度不同。
5. **保存原始快照。** 方便追溯、重新合并和 debug。
6. **中文增强源默认关闭。** 避免公开项目默认触发高风险访问。
7. **支持人工修正。** 免费书目数据不可能完全干净。

---

## 6. 检索流程

### 6.1 ISBN 查询流程

```text
GET /api/books/isbn/:isbn

1. 清洗 ISBN
2. 校验 ISBN-10 / ISBN-13
3. 查本地 confirmed edition
4. 查 search_cache
5. 并发查默认 Provider：
   - Open Library
   - Google Books
6. 如果结果弱，并且启用中文增强：
   - NLC OPAC
   - CALIS
   - PDC low-frequency provider
7. 映射为统一 Candidate
8. 按 ISBN 合并
9. 字段级选择最佳值
10. 保存 source_snapshot
11. 返回 edition 结果和来源说明
```

### 6.2 书名查询流程

```text
GET /api/books/search?q=置身事内&limit=10

1. 识别输入类型
2. 中文标题归一化
3. 简繁转换生成多个 query variant
4. 查本地搜索索引
5. 查 search_cache
6. 并发查默认 Provider：
   - Google Books
   - Open Library
7. 可选查中文增强 Provider：
   - CALIS
   - NLC OPAC
8. 合并候选
9. 评分排序
10. 返回候选列表
```

### 6.3 作者 + 书名查询流程

```text
GET /api/books/search?q=刘慈欣 三体

1. 尝试拆分作者和标题
2. 标题归一化
3. 作者名归一化
4. 查询多个 Provider
5. 标题相似度 + 作者相似度共同评分
6. 返回候选列表
```

---

## 7. 数据模型

### 7.1 概念模型

```text
Work
  表示作品概念，例如《三体》这个作品。

Edition
  表示具体版本，例如重庆出版社 2008 年版、英文译本、纪念版。

Contributor
  作者、译者、编者、绘者等贡献者。

Identifier
  ISBN、OLID、OCLC、LCCN、DOI、CIP 等外部标识。

SourceSnapshot
  某个 Provider 返回的原始数据。

Correction
  用户或管理员修正记录。
```

### 7.2 为什么区分 Work 和 Edition

中文书籍常见情况：

```text
同一本书，不同出版社
同一本书，不同译者
同一本书，不同版本
同一本书，平装 / 精装
同一套书，不同分册
同名不同书
```

所以规则是：

```text
ISBN 相同 → 可以合并为同一个 Edition
ISBN 不同但标题和作者高度一致 → 只能关联到同一个 Work
标题相同但作者不同 → 不合并
译者不同 → 不同 Edition
出版社不同 → 通常是不同 Edition
```

---

## 8. 数据库设计

以下以 PostgreSQL 为主。个人部署可以用 SQLite 简化。

### 8.1 works

```sql
CREATE TABLE works (
  id TEXT PRIMARY KEY,
  canonical_title TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  language TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_works_normalized_title ON works(normalized_title);
```

### 8.2 editions

```sql
CREATE TABLE editions (
  id TEXT PRIMARY KEY,
  work_id TEXT REFERENCES works(id),
  title TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  subtitle TEXT,
  publisher TEXT,
  published_date TEXT,
  isbn10 TEXT,
  isbn13 TEXT,
  page_count INTEGER,
  language TEXT,
  cover_url TEXT,
  description TEXT,
  confidence INTEGER NOT NULL DEFAULT 0,
  needs_review BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_editions_isbn13 ON editions(isbn13) WHERE isbn13 IS NOT NULL;
CREATE UNIQUE INDEX idx_editions_isbn10 ON editions(isbn10) WHERE isbn10 IS NOT NULL;
CREATE INDEX idx_editions_title ON editions(normalized_title);
```

### 8.3 contributors

```sql
CREATE TABLE contributors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  original_script TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contributors_normalized_name ON contributors(normalized_name);
```

### 8.4 edition_contributors

```sql
CREATE TABLE edition_contributors (
  edition_id TEXT NOT NULL REFERENCES editions(id),
  contributor_id TEXT NOT NULL REFERENCES contributors(id),
  role TEXT NOT NULL DEFAULT 'author',
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (edition_id, contributor_id, role)
);
```

### 8.5 external_identifiers

```sql
CREATE TABLE external_identifiers (
  id TEXT PRIMARY KEY,
  edition_id TEXT REFERENCES editions(id),
  work_id TEXT REFERENCES works(id),
  source TEXT NOT NULL,
  identifier_type TEXT NOT NULL,
  identifier_value TEXT NOT NULL,
  external_url TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source, identifier_type, identifier_value)
);
```

### 8.6 source_snapshots

```sql
CREATE TABLE source_snapshots (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  query TEXT NOT NULL,
  query_type TEXT NOT NULL,
  response_json JSONB NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_source_snapshots_source ON source_snapshots(source);
CREATE INDEX idx_source_snapshots_query ON source_snapshots(query);
```

### 8.7 search_cache

```sql
CREATE TABLE search_cache (
  cache_key TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  query_type TEXT NOT NULL,
  result_json JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_search_cache_expires_at ON search_cache(expires_at);
```

### 8.8 corrections

```sql
CREATE TABLE corrections (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'user',
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP
);
```

### 8.9 covers

```sql
CREATE TABLE covers (
  id TEXT PRIMARY KEY,
  edition_id TEXT NOT NULL REFERENCES editions(id),
  source TEXT NOT NULL,
  remote_url TEXT,
  local_url TEXT,
  width INTEGER,
  height INTEGER,
  license TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## 9. Provider 抽象设计

### 9.1 Provider 接口

```ts
export interface BookProvider {
  name: string;

  searchByISBN(isbn: string): Promise<BookCandidate[]>;

  searchByTitle(params: {
    title: string;
    author?: string;
    limit?: number;
    language?: string;
  }): Promise<BookCandidate[]>;
}
```

### 9.2 Candidate 统一结构

```ts
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

export interface ExternalIdentifier {
  type: 'isbn10' | 'isbn13' | 'olid' | 'oclc' | 'lccn' | 'doi' | 'cip' | 'other';
  value: string;
  source?: string;
}
```

### 9.3 Provider 配置

```ts
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
```

示例：

```ts
export const providerConfigs: ProviderConfig[] = [
  {
    name: 'open_library',
    enabled: true,
    priority: 40,
    riskLevel: 'low',
    supportsISBN: true,
    supportsTitleSearch: true,
    supportsCover: true,
    rateLimitPerMinute: 60,
    cacheTtlDays: 90,
    timeoutMs: 8000,
  },
  {
    name: 'google_books',
    enabled: true,
    priority: 50,
    riskLevel: 'low',
    supportsISBN: true,
    supportsTitleSearch: true,
    supportsCover: true,
    rateLimitPerMinute: 60,
    cacheTtlDays: 30,
    timeoutMs: 8000,
  },
  {
    name: 'nlc_opac',
    enabled: false,
    priority: 80,
    riskLevel: 'medium',
    supportsISBN: true,
    supportsTitleSearch: true,
    supportsCover: false,
    rateLimitPerMinute: 6,
    cacheTtlDays: 180,
    timeoutMs: 12000,
  },
  {
    name: 'calis',
    enabled: false,
    priority: 70,
    riskLevel: 'medium',
    supportsISBN: true,
    supportsTitleSearch: true,
    supportsCover: false,
    rateLimitPerMinute: 6,
    cacheTtlDays: 180,
    timeoutMs: 12000,
  },
  {
    name: 'pdc',
    enabled: false,
    priority: 100,
    riskLevel: 'medium',
    supportsISBN: true,
    supportsTitleSearch: true,
    supportsCover: false,
    rateLimitPerMinute: 2,
    cacheTtlDays: 365,
    timeoutMs: 15000,
  },
];
```

---

## 10. 中文归一化设计

### 10.1 ISBN 清洗

```ts
export function normalizeISBN(input: string): string {
  return input
    .replace(/ISBN/i, '')
    .replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/[\s\-—–]/g, '')
    .replace(/[^0-9Xx]/g, '')
    .toUpperCase();
}
```

### 10.2 中文标题清洗

```ts
export function normalizeChineseTitle(title: string): string {
  return title
    .normalize('NFKC')
    .replace(/[：:（(].*?[）)]/g, '')
    .replace(/第[一二三四五六七八九十百千万\d]+版/g, '')
    .replace(/修订版|新版|珍藏版|典藏版|纪念版|精装|平装/g, '')
    .replace(/[《》〈〉“”"'，,。.!！?？·•]/g, '')
    .replace(/\s+/g, '')
    .trim();
}
```

### 10.3 简繁转换

推荐依赖：

```text
opencc-js
```

使用策略：

```text
用户输入简体 → 原文检索 + 繁体变体检索
用户输入繁体 → 原文检索 + 简体变体检索
```

### 10.4 出版社别名

```json
{
  "人民邮电出版社": ["人邮", "人民邮电"],
  "机械工业出版社": ["机械工业", "机工社"],
  "电子工业出版社": ["电子工业", "电子社"],
  "中信出版社": ["中信出版集团", "中信出版"],
  "生活·读书·新知三联书店": ["三联书店", "三联"]
}
```

---

## 11. 合并与排序

### 11.1 字段优先级

```ts
export const fieldPriority = {
  isbn: ['pdc', 'nlc_opac', 'calis', 'google_books', 'open_library'],
  title: ['pdc', 'nlc_opac', 'calis', 'google_books', 'open_library'],
  authors: ['pdc', 'nlc_opac', 'calis', 'google_books', 'open_library'],
  publisher: ['pdc', 'nlc_opac', 'calis', 'google_books', 'open_library'],
  publishedDate: ['pdc', 'nlc_opac', 'calis', 'google_books', 'open_library'],
  categories: ['pdc', 'nlc_opac', 'calis', 'open_library', 'google_books'],
  coverUrl: ['google_books', 'open_library', 'user_upload'],
  description: ['google_books', 'open_library', 'manual'],
};
```

### 11.2 候选评分

```ts
export function scoreCandidate(candidate: BookCandidate, query: SearchQuery): number {
  let score = 0;

  if (query.isbn && [candidate.isbn10, candidate.isbn13].includes(query.isbn)) {
    score += 60;
  }

  score += titleSimilarity(query.title, candidate.title) * 20;
  score += authorSimilarity(query.author, candidate.authors) * 10;

  if (candidate.publisher && query.publisher && samePublisher(query.publisher, candidate.publisher)) {
    score += 5;
  }

  if (candidate.publishedDate && query.year && nearYear(candidate.publishedDate, query.year)) {
    score += 5;
  }

  if (candidate.coverUrl) score += 3;
  if (!candidate.isbn10 && !candidate.isbn13) score -= 20;
  if (!candidate.title) score -= 50;

  return Math.max(0, Math.min(100, Math.round(score)));
}
```

### 11.3 返回策略

| 场景 | 策略 |
|---|---|
| ISBN 精确命中且分数 > 90 | 返回第一结果，附 sources |
| ISBN 命中但字段冲突大 | 返回结果并标记 `needsReview: true` |
| 书名搜索第一名领先第二名 > 20 分 | 第一名标记 `recommended: true` |
| 书名搜索结果接近 | 返回候选列表，不默认唯一匹配 |
| 缺 ISBN | 降低置信度 |
| 多个版本 | 按 edition 展示，不合并成一个 |

---

## 12. API 设计

### 12.1 搜索图书

```http
GET /api/books/search?q=三体&limit=10
```

响应：

```json
{
  "query": "三体",
  "queryType": "title",
  "results": [
    {
      "id": "edition_01HXYZ",
      "workId": "work_01HXYZ",
      "title": "三体",
      "subtitle": null,
      "authors": [{ "name": "刘慈欣", "role": "author" }],
      "publisher": "重庆出版社",
      "publishedDate": "2008",
      "isbn10": "7536692935",
      "isbn13": "9787536692930",
      "language": "zh",
      "coverUrl": "https://example.com/cover.jpg",
      "description": "...",
      "confidence": 94,
      "recommended": true,
      "needsReview": false,
      "sources": [
        { "name": "google_books", "externalId": "..." },
        { "name": "open_library", "externalId": "..." }
      ]
    }
  ]
}
```

### 12.2 ISBN 精确查询

```http
GET /api/books/isbn/9787536692930
```

### 12.3 获取图书详情

```http
GET /api/books/:editionId
```

### 12.4 提交修正

```http
POST /api/books/:editionId/corrections
Content-Type: application/json

{
  "field": "publisher",
  "value": "重庆出版社",
  "note": "根据实体书版权页修正"
}
```

### 12.5 触发重新聚合

```http
POST /api/books/:editionId/refresh
```

### 12.6 Provider 状态

```http
GET /api/providers/status
```

响应：

```json
{
  "providers": [
    {
      "name": "open_library",
      "enabled": true,
      "healthy": true,
      "lastSuccessAt": "2026-05-18T10:00:00Z",
      "lastErrorAt": null
    }
  ]
}
```

---

## 13. 缓存策略

| 缓存对象 | TTL | 原因 |
|---|---:|---|
| ISBN 精确查询 | 30 - 180 天 | ISBN 元数据变化不频繁 |
| 书名搜索结果 | 7 - 30 天 | 搜索结果可能变化 |
| Open Library 结果 | 90 天 | 开放书目数据较稳定 |
| Google Books 结果 | 30 天 | 搜索和封面可能变化 |
| 中文增强源结果 | 180 - 365 天 | 低频访问，强缓存 |
| 失败结果 | 1 - 7 天 | 避免重复打失败源 |
| 用户确认数据 | 永久 | 作为本地可信数据 |

### 13.1 Cache key

```ts
function createCacheKey(input: {
  provider: string;
  queryType: 'isbn' | 'title' | 'title_author';
  query: string;
  language?: string;
}) {
  return sha256(JSON.stringify(input));
}
```

---

## 14. 限流和降级

### 14.1 限流策略

```text
Open Library: 60 requests / minute
Google Books: 60 requests / minute, configurable
NLC OPAC: 6 requests / minute
CALIS: 6 requests / minute
PDC: 2 requests / minute or manual only
Crossref: polite pool, identify app by mailto if used
```

### 14.2 降级策略

| 失败情况 | 处理 |
|---|---|
| Provider timeout | 跳过该源，返回其他源结果 |
| Provider 429 | 降低该源优先级，短期熔断 |
| Provider 5xx | 熔断 5 - 30 分钟 |
| 所有外部源失败 | 返回本地缓存 stale result |
| 无结果 | 返回空列表和建议输入 ISBN |

### 14.3 熔断状态

```ts
export interface CircuitBreakerState {
  provider: string;
  status: 'closed' | 'open' | 'half_open';
  failureCount: number;
  openedAt?: Date;
  nextRetryAt?: Date;
}
```

---

## 15. 封面策略

### 15.1 获取优先级

```text
1. Google Books imageLinks
2. Open Library Covers API by ISBN
3. Open Library cover id
4. 用户上传
5. 管理员维护
```

### 15.2 存储策略

```text
v0.1: 返回远程 URL
v0.2: 可选下载缩略图到对象存储
v0.3: 增加版权 / 来源记录
```

### 15.3 注意事项

- 不大规模爬取封面接口。
- 不默认缓存不允许缓存的封面。
- 保留封面来源字段。
- 支持用户上传封面作为本地修正。

---

## 16. 技术栈建议

### 16.1 推荐开源项目栈

```text
Runtime: Node.js 20+
Language: TypeScript
API Framework: Hono / Fastify
DB: SQLite by default, PostgreSQL optional
ORM: Drizzle ORM
Cache: SQLite table by default, Redis optional
Search: SQLite FTS5 by default, Meilisearch optional
Queue: BullMQ optional
Storage: Local filesystem / S3 / Cloudflare R2 optional
Deploy: Docker Compose
```

### 16.2 为什么默认 SQLite

- 个人开发者部署成本低。
- 开源项目一键启动更简单。
- v0.1 数据量不大时足够。
- 后续可通过配置切换 PostgreSQL。

### 16.3 推荐目录结构

```text
booknest/
  apps/
    api/
      src/
        api/
          routes/
            books.ts
            isbn.ts
            providers.ts
            corrections.ts
        core/
          normalize.ts
          router.ts
          merge.ts
          score.ts
          cache.ts
          rate-limit.ts
          circuit-breaker.ts
        providers/
          open-library/
            index.ts
            mapper.ts
            types.ts
          google-books/
            index.ts
            mapper.ts
            types.ts
          crossref/
            index.ts
            mapper.ts
          loc/
            index.ts
            mapper.ts
          nlc-opac/
            index.ts
            parser.ts
            mapper.ts
          calis/
            index.ts
            parser.ts
            mapper.ts
          pdc/
            index.ts
            manual.ts
        db/
          schema.ts
          migrations/
        config/
          providers.ts
          env.ts
        jobs/
          refresh-book.ts
          import-open-library.ts
        server.ts
  packages/
    shared/
      src/
        types.ts
        isbn.ts
  docs/
    design.md
    provider-policy.md
    api.md
  docker-compose.yml
  README.md
  .env.example
```

---

## 17. 环境变量

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=file:./booknest.db

# Providers
ENABLE_OPEN_LIBRARY=true
ENABLE_GOOGLE_BOOKS=true
ENABLE_CROSSREF=false
ENABLE_LOC=false
ENABLE_NLC_OPAC=false
ENABLE_CALIS=false
ENABLE_PDC=false

# Google Books
GOOGLE_BOOKS_API_KEY=

# App identity for polite API usage
APP_USER_AGENT=BookNest/0.1 (https://github.com/yourname/booknest; mailto:you@example.com)
APP_CONTACT_EMAIL=you@example.com

# Cache
DEFAULT_SEARCH_CACHE_TTL_DAYS=30
DEFAULT_ISBN_CACHE_TTL_DAYS=90

# Storage
COVER_STORAGE_DRIVER=remote
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

---

## 18. 开源合规策略

### 18.1 README 必须声明

```text
BookNest 默认只启用 Open Library 和 Google Books 等公开 API。
中文增强 Provider 可能访问第三方公开检索页面，默认关闭。
使用者需要自行确认目标站点的服务条款、访问频率和授权条件。
本项目不包含豆瓣、京东、当当、淘宝、微信读书等商业平台抓取逻辑。
```

### 18.2 Provider Policy

每个 Provider 需要单独说明：

```text
- 数据来源
- 官方文档
- 是否默认启用
- 是否需要 API key
- 是否允许缓存
- 建议请求频率
- 已知限制
- 合规注意事项
```

---

## 19. 路线图

### v0.1：MVP

目标：跑通基础查询。

- ISBN 清洗与校验
- Open Library Provider
- Google Books Provider
- 统一 Candidate 类型
- 简单合并和排序
- SQLite 缓存
- `/api/books/search`
- `/api/books/isbn/:isbn`
- Docker Compose

### v0.2：数据质量

目标：让结果可沉淀、可修正。

- Work / Edition 模型
- Source Snapshot
- Correction API
- Provider 状态页
- 熔断和限流
- 中文标题归一化
- 简繁转换

### v0.3：中文增强

目标：改善中文书籍命中率。

- NLC OPAC Provider, optional
- CALIS Provider, optional
- 中文出版社别名表
- 作者 / 译者角色识别
- 中文搜索评分优化

### v0.4：本地索引

目标：减少外部 API 依赖。

- Open Library dump 导入
- Meilisearch / SQLite FTS5 索引
- 定期 refresh job
- 封面缓存策略

### v0.5：生态集成

目标：适配更多使用方式。

- MCP Server
- CLI
- JavaScript SDK
- Python SDK
- Web 管理后台

---

## 20. 测试策略

### 20.1 单元测试

覆盖：

- ISBN 清洗和校验
- 中文标题归一化
- Provider mapper
- 字段合并
- 候选评分

### 20.2 集成测试

使用录制的 API fixture，避免 CI 中频繁请求外部服务。

```text
fixtures/
  open-library/
    isbn-9787536692930.json
  google-books/
    isbn-9787536692930.json
```

### 20.3 测试样本

```text
ISBN:
- 9787536692930 三体
- 9787115546081 置身事内
- 9787111128069 深入理解计算机系统

书名：
- 三体
- 置身事内
- 活着
- 代码大全
- The Pragmatic Programmer
```

---

## 21. 风险清单

| 风险 | 严重度 | 应对 |
|---|---:|---|
| 中文书数据不全 | 高 | 中文增强 Provider + 用户修正 |
| 免费 API 限流 | 高 | 本地缓存 + 熔断 + dump |
| 书名匹配错误 | 高 | 返回候选，不强制唯一 |
| 版本合并错误 | 高 | Work / Edition 分离 |
| 封面失效 | 中 | 多源 fallback + 可选本地缓存 |
| Provider 页面结构变化 | 中 | Provider 隔离 + fixture 测试 |
| 合规风险 | 高 | 默认只启用公开 API，高风险源默认关闭 |
| 数据冲突 | 中 | source snapshot + 字段优先级 |

---

## 22. 外部资料与参考

### Open Library

- API 文档：https://openlibrary.org/developers/api
- Books API：https://openlibrary.org/dev/docs/api/books
- Covers API：https://openlibrary.org/dev/docs/api/covers
- Data Dumps：https://openlibrary.org/data

### Google Books

- Google Books API：https://developers.google.com/books
- 使用 API 文档：https://developers.google.cn/books/docs/v1/using?hl=zh-cn

### Crossref

- REST API 文档：https://www.crossref.org/documentation/retrieve-metadata/rest-api/
- API Root：https://api.crossref.org/

### Library of Congress

- APIs：https://www.loc.gov/apis/

### 中文源

- 国家版本数据中心 PDC：https://pdc.capub.cn/
- 中国国家图书馆：https://www.nlc.cn/web/index.shtml
- CALIS 联合目录：https://opac2.calis.edu.cn/
- 全国图书馆参考咨询联盟：https://www.ucdrs.cn/

---

## 23. 最小实现建议

先做这个闭环：

```text
BookNest v0.1
  - TypeScript + Hono
  - SQLite + Drizzle
  - Open Library Provider
  - Google Books Provider
  - ISBN search
  - Title search
  - Search cache
  - Merge + score
  - Docker Compose
```

不要一开始做中文增强源。原因：

1. 中文权威源自动化成本更高。
2. Provider 结构还没稳定时，过早接入页面型数据源会增加维护成本。
3. 先通过 Open Library + Google Books + 用户修正跑出真实查询样本，再决定 NLC / CALIS 的实现优先级。

推荐第一批 issue：

```text
1. Init monorepo
2. Add ISBN normalization
3. Add Open Library provider
4. Add Google Books provider
5. Define BookCandidate type
6. Add search cache table
7. Implement /api/books/isbn/:isbn
8. Implement /api/books/search
9. Add merge and scoring
10. Add Docker Compose
```

---

## 24. 项目 README 摘要草稿

```md
# BookNest

BookNest is an open-source book metadata aggregation service for ISBN and title search.

It aggregates public book metadata sources such as Open Library and Google Books, normalizes results into a unified schema, ranks candidates, and stores confirmed metadata locally.

## Features

- Search books by ISBN or title
- Aggregate metadata from multiple providers
- Normalize book candidates into a unified schema
- Return cover, title, author, publisher, date, ISBN, language and description
- Cache provider results locally
- Separate work and edition models
- Support manual corrections
- Optional Chinese metadata providers

## Default providers

- Open Library
- Google Books

## Optional providers

- Crossref
- Library of Congress
- National Library of China OPAC
- CALIS Union Catalog
- PDC / China ISBN and CIP data service

## Non-goals

BookNest does not scrape Douban, JD, Dangdang, WeRead, Taobao or other commercial platforms.
```
