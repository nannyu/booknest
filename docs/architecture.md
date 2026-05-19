# 架构设计

> 本文档浓缩自 [booknest_design.md](../booknest_design.md) 第 5–11 章，给开发者提供可快速阅读的架构视图。完整设计请阅读原文。

## 1. 总体数据流

```text
Client
  ↓
API Gateway          (Hono)
  ↓
Input Normalizer     (ISBN 清洗、标题归一化、queryType 检测)
  ↓
Search Router        (按 queryType 路由：isbn / title / author / title_author)
  ↓
Local Cache          (search_cache 表，sha256 key，命中即返)
  ↓ miss
Provider Orchestrator (并发调用，超时/限流/熔断)
  ├─ Open Library       (默认开)
  ├─ Google Books       (默认开)
  ├─ Crossref           (可选)
  ├─ Library of Congress(可选)
  ├─ Commercial ISBN    (可选, ISBNdb / API Ninjas / 自定义)
  └─ [未实现] NLC OPAC / CALIS / PDC / WorldCat
  ↓
Candidate Mapper      (各 Provider → BookCandidate 统一结构)
  ↓
Merge Engine          (按 ISBN/标题+作者+出版社+语言+译者 分组 + fieldPriority 选优)
  ↓
Ranking Engine        (queryType-aware 评分 + 多源共识 + 完整度)
  ↓
Persistence Layer     (works / editions / contributors / edition_sources / external_identifiers)
  ↓
API Response          (RankedBook[]，含持久化 id 供详情深链)
```

## 2. 模块划分

```text
apps/api/src/
├── api/
│   ├── routes/
│   │   ├── books.ts        # /api/books/search, /api/books/isbn/:isbn, /api/books/:id
│   │   ├── providers.ts    # /api/providers
│   │   └── corrections.ts  # /api/corrections
│   └── middleware/
│       └── error.ts        # 统一错误响应
├── core/
│   ├── router.ts           # 顶层编排：cache → provider → merge → score → persist
│   ├── merge.ts            # 按 groupKey 聚合 + fieldPriority 选优
│   ├── score.ts            # queryType-aware + 多源 + 完整度
│   ├── cache.ts            # search_cache 读写
│   ├── rate-limit.ts       # 令牌桶
│   ├── circuit-breaker.ts  # 三态熔断
│   ├── persist.ts          # MergedCandidate → DB（works/editions/...）
│   └── load.ts             # editionId → RankedBook（详情页）
├── providers/
│   ├── open-library/       # 默认启用
│   ├── google-books/       # 默认启用
│   ├── crossref/           # 可选
│   ├── loc/                # 可选
│   └── commercial-isbn/    # 可选；presets.ts 内置 isbndb + api_ninjas
├── db/
│   ├── schema.ts           # Drizzle schema
│   ├── client.ts           # better-sqlite3 + WAL
│   ├── migrate.ts          # 启动迁移
│   └── migrations/         # 0000 / 0001 / 0002
├── lib/
│   ├── http.ts             # fetchJson：UA/超时/自定义 headers
│   └── provider-fetch.ts   # ProviderFetchResult 类型
├── config/
│   ├── env.ts              # zod 解析；superRefine 校验关联约束
│   └── providers.ts        # ProviderConfig + 工厂
├── public/index.html       # 单页前端（hash 路由 + 详情视图）
└── server.ts               # Hono app 入口 + serveStatic
```

## 3. 关键设计原则

1. **先查本地，再查外部** — 保护免费 API，降低延迟
2. **ISBN 精确优先** — ISBN 是版本级唯一标识，可信度最高
3. **书名 / 作者搜索返回候选** — 有歧义，不强行唯一匹配
4. **字段级合并** — 不同源在不同字段上可信度不同
5. **保存原始快照** — `source_snapshots` 表存 raw JSON，方便追溯
6. **中文增强源默认关闭** — 避免公开项目默认触发高风险访问
7. **Provider 隔离** — 单个源失败/页面结构变化不影响其他源
8. **持久化每次搜索结果** — 详情页可深链；upsert 按 ISBN 去重

## 4. Work / Edition 模型

```text
Work       一个作品（例如《三体》）
  ├── Edition A   (重庆出版社 2008 平装)
  ├── Edition B   (重庆出版社 2017 纪念版)
  └── Edition C   (Tor Books 英文译本)
```

合并规则（`core/merge.ts`）：

| 条件 | 处理 |
|---|---|
| ISBN-13 相同 | 合并为同一 Edition |
| ISBN-10 相同 | 合并为同一 Edition |
| 无 ISBN：标题+作者+出版社+语言+译者全一致 | 合并 |
| 否则 | 不合并 |

持久化（`core/persist.ts`）：

| 操作 | 触发条件 |
|---|---|
| 复用现有 Edition | 找到同 ISBN-13/10 的 row |
| 创建新 Edition | 没有匹配 ISBN |
| 复用现有 Work | 同 `normalizedTitle + 第一作者` 已有 work |
| 创建新 Work | 没有匹配 work（不同 ISBN 但同书 link 到同一 work） |

## 5. 检索流程

### ISBN 查询

```text
GET /api/books/isbn/:isbn

normalizeISBN → validate
  ↓
对每个支持 ISBN 的 enabled provider:
  cache.lookup
    ├─ HIT  → 用缓存
    └─ MISS → searchByISBN → mapper → 写 source_snapshot → 写 cache
  ↓
allSettled 收集 BookCandidate[]
  ↓
mergeCandidates  (按 ISBN-13/10 分组)
  ↓
scoreCandidate × N → sort desc
  ↓
persistMergedCandidate × N → 拿到 DB edition id
  ↓
applyReturnPolicy (recommended / needsReview)
  ↓
返回 RankedBook[]
```

### 书名 / 作者 / 作者+书名查询

同上，差异只在 `queryProvider` 分发：
- `queryType=title` / `title_author` → `provider.searchByTitle`
- `queryType=author` → `provider.searchByAuthor`（optional method，不实现的源被跳过）

## 6. 字段优先级（合并时）

```ts
const fieldPriority = {
  isbn:          ['commercial_isbn', 'pdc', 'nlc_opac', 'calis', 'google_books', 'open_library', 'crossref', 'loc'],
  title:         ['commercial_isbn', 'pdc', 'nlc_opac', 'calis', 'google_books', 'open_library', 'crossref', 'loc'],
  authors:       ['commercial_isbn', 'pdc', 'nlc_opac', 'calis', 'google_books', 'open_library', 'crossref', 'loc'],
  publisher:     ['commercial_isbn', 'pdc', 'nlc_opac', 'calis', 'google_books', 'open_library', 'crossref', 'loc'],
  publishedDate: ['commercial_isbn', 'pdc', 'nlc_opac', 'calis', 'google_books', 'open_library', 'crossref', 'loc'],
  categories:    ['commercial_isbn', 'pdc', 'nlc_opac', 'calis', 'open_library', 'google_books', 'crossref', 'loc'],
  coverUrl:      ['commercial_isbn', 'google_books', 'open_library', 'loc'],
  description:   ['commercial_isbn', 'google_books', 'open_library', 'crossref', 'loc'],
};
```

> **解读**：商业付费源最权威（用户付了钱）；中文增强源对中文字段（标题/作者/出版社）优先；封面/简介 Google Books 通常质量更高；Crossref/LOC 作为兜底。

## 7. 候选评分

```text
基础分 0

(1) ISBN 命中
  + 60                                   query 提供 ISBN 且 candidate 匹配

(2) queryType-aware 相似度
                          title × W      author × W
  isbn          → W=20    W=10
  title         → W=50    W=10
  title_author  → W=30    W=30
  author        → W=10    W=60

(3) 多源共识
  + 10   2 sources
  + 15   3 sources
  + 20   4+ sources

(4) 字段完整度
  + 3    authors[] 非空
  + 3    publisher
  + 3    publishedDate
  + 3    description
  + 2    pageCount
  + 2    language
  + 2    categories[] 非空
  + 3    coverUrl

(5) 辅助
  + 5    publisher 与 query 一致
  + 5    年份接近 ±2

(6) 惩罚
  - 20   无任何 ISBN
  - 50   无标题

clamp(0, 100)
```

返回策略（`core/router.ts` 的 `applyReturnPolicy`）：

| 场景 | 处理 |
|---|---|
| `queryType=isbn` 且 ISBN 实际匹配 + 分 ≥ 80 | `recommended: true` |
| 非 ISBN 查询，top 比第二名领先 > 20 | `recommended: true` |
| 任意场景，分 < 60 | `needsReview: true` |

> 阈值是基于 50 ISBN 实测分布定的：典型双源命中落在 88-91 区间，单源命中落在 70-78 区间，未找到为 0。

## 8. 缓存策略

| 对象 | TTL | 说明 |
|---|---:|---|
| ISBN 精确查询 | per provider | Open Library 90 / Google Books 30 / Crossref 90 / LOC 90 |
| 失败结果 | 1 天 | `FAILURE_CACHE_TTL_DAYS` |
| 用户确认数据（持久化） | 永久 | 直接落 `editions` 表 |

Cache key：

```ts
sha256(`${provider}:${queryType}:${query}:${language ?? ''}`)
```

## 9. 限流与熔断

```text
Open Library / Google Books / Crossref / LOC / Commercial ISBN: 60 req/min
NLC OPAC / CALIS:                                                 6 req/min（未实现）
PDC:                                                              2 req/min 或仅手动（未实现）
```

熔断三态：`closed` → `open`（5 次失败）→ `half_open`（5 分钟后探测一次）→ `closed | open`。

`half_open` 状态下用 `probeSent` 标志保证只放 1 次探测请求，并发不放行多个。

## 10. 数据库 schema 简表

| 表 | 主键 | 用途 |
|---|---|---|
| `works` | id | 作品级元数据 |
| `editions` | id | 版本级元数据（封面、ISBN、出版社、置信度、categories JSON） |
| `contributors` | id | 作者/译者/编者（normalized_name UNIQUE） |
| `edition_contributors` | (edition_id, contributor_id, role) | M:N，含 role + position |
| `edition_sources` | (edition_id, source) | 每个 edition 命中的源（externalId/Url） |
| `external_identifiers` | id | ISBN/OLID/OCLC/LCCN/DOI/CIP 等 |
| `source_snapshots` | id | Provider 原始响应（追溯/重放） |
| `search_cache` | cache_key | 查询缓存 |
| `corrections` | id | 人工修正历史 |
| `covers` | id | 封面 URL/license/尺寸 |
| `provider_health` | name | 熔断状态 + 最近成败时间 |

> 完整 DDL 见 [booknest_design.md §8](../booknest_design.md#8-数据库设计) 与 `apps/api/src/db/migrations/`。
