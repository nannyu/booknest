# 架构设计

> 本文档浓缩自 [booknest_design.md](../booknest_design.md) 第 5–11 章，给开发者提供可快速阅读的架构视图。完整设计请阅读原文。

## 1. 总体数据流

```text
Client
  ↓
API Gateway          (Hono)
  ↓
Input Normalizer     (ISBN 清洗、标题归一化、简繁转换)
  ↓
Search Router        (按 queryType 路由到对应链路)
  ↓
Local Cache / DB     (SQLite，命中即返)
  ↓ miss
Provider Orchestrator (并发调用，超时/限流/熔断)
  ├─ Open Library
  ├─ Google Books
  └─ [可选] Crossref / LoC / NLC OPAC / CALIS / PDC
  ↓
Candidate Mapper      (各 Provider → BookCandidate 统一结构)
  ↓
Merge Engine          (按字段优先级合并)
  ↓
Ranking Engine        (打分、排序、置信度)
  ↓
Persistence Layer     (search_cache + source_snapshots)
  ↓
API Response
```

## 2. 模块划分

```text
apps/api/src/
├── api/routes/           # HTTP 层（薄）
│   ├── books.ts          # /api/books/search, /api/books/:id
│   ├── isbn.ts           # /api/books/isbn/:isbn
│   ├── providers.ts      # /api/providers/status
│   └── corrections.ts    # /api/books/:id/corrections
├── core/                 # 业务核心
│   ├── normalize.ts      # ISBN、中文标题归一化
│   ├── router.ts         # 调度 Provider
│   ├── merge.ts          # 字段级合并
│   ├── score.ts          # 候选评分
│   ├── cache.ts          # search_cache 操作
│   ├── rate-limit.ts     # 每分钟令牌桶
│   └── circuit-breaker.ts# 熔断
├── providers/            # 数据源适配（一个目录一个 provider）
│   ├── open-library/
│   │   ├── index.ts      # BookProvider 实现
│   │   ├── mapper.ts     # OL Response → BookCandidate
│   │   └── types.ts
│   └── google-books/
│       ├── index.ts
│       ├── mapper.ts
│       └── types.ts
├── db/
│   ├── schema.ts         # Drizzle schema
│   ├── client.ts         # better-sqlite3 客户端
│   └── migrations/       # SQL 迁移
├── config/
│   ├── env.ts            # 环境变量解析
│   └── providers.ts      # ProviderConfig 列表
└── server.ts             # Hono app 入口
```

## 3. 关键设计原则

1. **先查本地，再查外部** — 保护免费 API，降低延迟
2. **ISBN 精确优先** — ISBN 是版本级唯一标识，可信度最高
3. **书名搜索返回候选** — 书名有歧义，不应默认唯一匹配
4. **字段级合并** — 不同源在不同字段上可信度不同
5. **保存原始快照** — 方便追溯、重新合并、debug
6. **中文增强源默认关闭** — 避免公开项目默认触发高风险访问
7. **Provider 隔离** — 单个源失败/页面结构变化不影响其他源

## 4. Work / Edition 模型

```text
Work       一个作品（例如《三体》）
  ├── Edition A   (重庆出版社 2008 平装)
  ├── Edition B   (重庆出版社 2017 纪念版)
  └── Edition C   (Tor Books 英文译本)
```

合并规则：

| 条件 | 处理 |
|---|---|
| ISBN 相同 | 合并为同一个 Edition |
| ISBN 不同但标题、作者高度一致 | 关联到同一个 Work，分别 Edition |
| 标题相同但作者不同 | 不合并 |
| 译者不同 | 不同 Edition |
| 出版社不同 | 通常是不同 Edition |

## 5. 检索流程

### ISBN 查询

```text
GET /api/books/isbn/:isbn

normalizeISBN → validate → cache.lookup
  ├─ HIT  → 返回
  └─ MISS → 并发 Provider.searchByISBN
            → mapToCandidates
            → mergeByISBN
            → scoreAndRank
            → cache.write
            → 返回
```

### 书名查询

```text
GET /api/books/search?q=...

detectQueryType → normalizeTitle → 简繁变体
  → cache.lookup
  ├─ HIT  → 返回
  └─ MISS → 并发 Provider.searchByTitle
            → mapToCandidates
            → mergeCandidates (按 ISBN/标题+作者聚合)
            → scoreAndRank (标题相似度 + 作者相似度 + 来源权重)
            → cache.write
            → 返回 candidates 列表
```

## 6. 字段优先级（合并时）

```ts
const fieldPriority = {
  isbn:          ['pdc', 'nlc_opac', 'calis', 'google_books', 'open_library'],
  title:         ['pdc', 'nlc_opac', 'calis', 'google_books', 'open_library'],
  authors:       ['pdc', 'nlc_opac', 'calis', 'google_books', 'open_library'],
  publisher:     ['pdc', 'nlc_opac', 'calis', 'google_books', 'open_library'],
  publishedDate: ['pdc', 'nlc_opac', 'calis', 'google_books', 'open_library'],
  coverUrl:      ['google_books', 'open_library', 'user_upload'],
  description:   ['google_books', 'open_library', 'manual'],
};
```

> **解读**：对中文权威字段（标题/作者/出版社），优先采用 PDC / NLC / CALIS；封面优先 Google Books（图像质量更好）；简介优先 Google Books（编辑过的文案）。

## 7. 候选评分

```text
基础分 0
+ ISBN 命中            +60
+ 标题相似度 × 20      (0.0 ~ 1.0)
+ 作者相似度 × 10      (0.0 ~ 1.0)
+ 出版社一致           +5
+ 年份接近             +5
+ 有封面               +3
- 缺 ISBN              -20
- 缺标题               -50

clamp(0, 100)
```

返回策略：

| 场景 | 处理 |
|---|---|
| ISBN 精确命中 & 分数 > 90 | 返回首条，附 sources |
| ISBN 命中但字段冲突大 | 返回但 `needsReview: true` |
| 书名搜索第一名领先 > 20 分 | 第一名 `recommended: true` |
| 书名搜索接近 | 返回候选列表 |
| 多个版本 | 按 edition 展示，不合并 |

## 8. 缓存策略

| 对象 | TTL | 说明 |
|---|---:|---|
| ISBN 精确查询 | 90 天 | 元数据变化少 |
| 书名搜索结果 | 30 天 | 搜索结果可能变化 |
| Open Library | 90 天 | 开放书目稳定 |
| Google Books | 30 天 | 内容可能变化 |
| 中文增强源 | 180–365 天 | 强缓存 |
| 失败结果 | 1–7 天 | 避免重复打失败源 |
| 用户确认数据 | 永久 | 本地可信数据 |

Cache key 设计：

```ts
sha256(JSON.stringify({ provider, queryType, query, language? }))
```

## 9. 限流与熔断

```text
Open Library: 60 req/min
Google Books: 60 req/min
NLC OPAC:      6 req/min
CALIS:         6 req/min
PDC:           2 req/min 或仅手动
```

熔断三态：`closed` → `open`（失败超阈值）→ `half_open`（探测）→ `closed`。

## 10. 数据库 schema 简表

| 表 | 主键 | 用途 |
|---|---|---|
| `works` | id | 作品级元数据 |
| `editions` | id | 版本级元数据（封面、ISBN、出版社、置信度） |
| `contributors` | id | 作者/译者/编者 |
| `edition_contributors` | (edition_id, contributor_id, role) | M:N |
| `external_identifiers` | id | ISBN/OLID/OCLC/LCCN/DOI/CIP |
| `source_snapshots` | id | Provider 原始响应（用于追溯） |
| `search_cache` | cache_key | 缓存查询结果 |
| `corrections` | id | 人工修正历史 |
| `covers` | id | 封面 URL/license/尺寸 |

> 完整 DDL 见 [booknest_design.md §8](../booknest_design.md#8-数据库设计)。
