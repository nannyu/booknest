# Graph Report - booknest  (2026-05-19)

## Corpus Check
- 63 files · ~21,962 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 636 nodes · 871 edges · 41 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bbbc33c3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]

## God Nodes (most connected - your core abstractions)
1. `BookNest：开放图书元数据聚合服务设计文档` - 25 edges
2. `getDb()` - 18 edges
3. `Provider 策略` - 13 edges
4. `fetchFromProvider()` - 12 edges
5. `CLAUDE.md — BookNest 项目级指令` - 12 edges
6. `架构设计` - 11 edges
7. `detectISBNFormat()` - 10 edges
8. `8. 数据库设计` - 10 edges
9. `API 参考` - 10 edges
10. `Env` - 9 edges

## Surprising Connections (you probably didn't know these)
- `syncContributors()` --calls--> `normalizeAuthorName()`  [INFERRED]
  apps/api/src/core/persist.ts → packages/shared/src/normalize.ts
- `splitIdentifiers()` --calls--> `normalizeISBN()`  [INFERRED]
  apps/api/src/providers/google-books/mapper.ts → packages/shared/src/isbn.ts
- `pickIsbns()` --calls--> `normalizeISBN()`  [INFERRED]
  apps/api/src/providers/open-library/mapper.ts → packages/shared/src/isbn.ts
- `pickIsbn()` --calls--> `normalizeISBN()`  [INFERRED]
  apps/api/src/providers/crossref/mapper.ts → packages/shared/src/isbn.ts
- `splitIdentifiers()` --calls--> `detectISBNFormat()`  [INFERRED]
  apps/api/src/providers/google-books/mapper.ts → packages/shared/src/isbn.ts

## Communities (41 total, 0 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (48): getEnabledProviders(), buildCacheKey(), CacheKeyInput, readCache(), writeCache(), canCall(), CircuitState, entries (+40 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (38): VALID_ROLES, ContributorRow, persistMergedCandidate(), syncContributors(), Contributor, contributors, CorrectionRow, corrections (+30 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (30): CommercialIsbnProvider, boolFromString, Env, envSchema, envSchemaWithRules, parsed, EnabledProvider, instances (+22 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (40): CALIS 联合目录（可选，**高风险**）, code:text (GET https://openlibrary.org/isbn/{isbn}.json), code:text (GET https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn), code:text (GET https://www.loc.gov/books/?q={query}&fo=json), code:env (ENABLE_COMMERCIAL_ISBN=true), Crossref（可选）, Google Books, Library of Congress（可选） (+32 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (33): groupKey(), scoreCandidate(), SIMILARITY_WEIGHTS, SimilarityWeights, broken, c, close, far (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (27): code:bash (git clone <repo>), code:bash (pnpm format        # prettier 一遍), code:text (/\      e2e (curl 真实 HTTP)), code:bash (# 1. 临时写一个一次性脚本调真实 API), code:text (main              生产分支，受保护), code:text (<type>(<scope>): <subject>), code:text (feat(provider:open-library): support isbn lookup), Commit message（Conventional Commits） (+19 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (26): 1. 搜索图书, 2. ISBN 精确查询, 3. 获取图书详情, 4. 提交修正, 5. 触发重新聚合, 6. Provider 健康状态, 7. 健康检查, API 参考 (+18 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (19): apiNinjas, isbndb, pickIsbns(), PresetConfig, PRESETS, cands, ApiNinjasResponse, CommercialPresetName (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (15): buildUrl(), FIELDS, mapDocs(), olLangCode(), OpenLibraryProvider, buildCoverUrl(), LANG_ISO_639_2_TO_1, mapOLDocToCandidate() (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (22): CLAUDE.md — BookNest 项目级指令, code:text (apps/api/src/), code:bash (pnpm install), code:bash (pnpm test             # 全量), "不要这么做"清单, 仓库布局, 修一个字段合并 bug, 关键不变量（修改前务必读这里） (+14 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (22): 10. 数据库 schema 简表, 1. 总体数据流, 2. 模块划分, 3. 关键设计原则, 4. Work / Edition 模型, 5. 检索流程, 6. 字段优先级（合并时）, 7. 候选评分 (+14 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (15): FIELD_PRIORITY, isPresent(), MergedCandidate, mergeGroup(), pickField(), pickFirstPresent(), Source, SourceMeta (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (14): buildUrl(), GoogleBooksProvider, mapItems(), shortLang(), bestCover(), mapGBVolumeToCandidate(), shortenLanguage(), splitIdentifiers() (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (18): BookNest, code:bash (# 安装依赖), code:bash (docker compose up -d), code:bash (# ISBN 查询), code:text (booknest/), Docker, 📜 License, 体验一下 (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (10): 8.1 works, 8.2 editions, 8.3 contributors, 8.4 edition_contributors, 8.5 external_identifiers, 8.6 source_snapshots, 8.7 search_cache, 8.8 corrections (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (15): BookCandidate, BookContributor, BookNestError, BookProvider, ContributorRole, ExternalIdentifier, IdentifierType, ProviderConfig (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.21
Nodes (9): LOCProvider, mapItems(), mapLOCResultToCandidate(), pickCover(), pickDescription(), cand, items, LOCResponse (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (15): 12.1 搜索图书, 12.2 ISBN 精确查询, 12.3 获取图书详情, 12.4 提交修正, 12.5 触发重新聚合, 12.6 Provider 状态, 12. API 设计, code:http (GET /api/books/search?q=三体&limit=10) (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.15
Nodes (12): 13.1 Cache key, 13. 缓存策略, 17. 环境变量, 21. 风险清单, 23. 最小实现建议, 24. 项目 README 摘要草稿, BookNest：开放图书元数据聚合服务设计文档, code:ts (function createCacheKey(input: {) (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.2
Nodes (10): 10.1 ISBN 清洗, 10.2 中文标题清洗, 10.3 简繁转换, 10.4 出版社别名, 10. 中文归一化设计, code:ts (export function normalizeISBN(input: string): string {), code:ts (export function normalizeChineseTitle(title: string): string), code:text (opencc-js) (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.25
Nodes (8): 9.1 Provider 接口, 9.2 Candidate 统一结构, 9.3 Provider 配置, 9. Provider 抽象设计, code:ts (export interface BookProvider {), code:ts (export interface BookCandidate {), code:ts (export type ProviderRiskLevel = 'low' | 'medium' | 'high';), code:ts (export const providerConfigs: ProviderConfig[] = [)

### Community 21 - "Community 21"
Cohesion: 0.43
Nodes (6): ALLOWED_PROVIDERS, buildUrl(), main(), parseArgs(), RecordArgs, safeName()

### Community 22 - "Community 22"
Cohesion: 0.29
Nodes (7): 6.1 ISBN 查询流程, 6.2 书名查询流程, 6.3 作者 + 书名查询流程, 6. 检索流程, code:text (GET /api/books/isbn/:isbn), code:text (GET /api/books/search?q=置身事内&limit=10), code:text (GET /api/books/search?q=刘慈欣 三体)

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (6): 16.1 推荐开源项目栈, 16.2 为什么默认 SQLite, 16.3 推荐目录结构, 16. 技术栈建议, code:text (Runtime: Node.js 20+), code:text (booknest/)

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (6): 22. 外部资料与参考, Crossref, Google Books, Library of Congress, Open Library, 中文源

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (6): 15.1 获取优先级, 15.2 存储策略, 15.3 注意事项, 15. 封面策略, code:text (1. Google Books imageLinks), code:text (v0.1: 返回远程 URL)

### Community 26 - "Community 26"
Cohesion: 0.33
Nodes (6): 11.1 字段优先级, 11.2 候选评分, 11.3 返回策略, 11. 合并与排序, code:ts (export const fieldPriority = {), code:ts (export function scoreCandidate(candidate: BookCandidate, que)

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (6): 7.1 概念模型, 7.2 为什么区分 Work 和 Edition, 7. 数据模型, code:text (Work), code:text (同一本书，不同出版社), code:text (ISBN 相同 → 可以合并为同一个 Edition)

### Community 28 - "Community 28"
Cohesion: 0.33
Nodes (6): 14.1 限流策略, 14.2 降级策略, 14.3 熔断状态, 14. 限流和降级, code:text (Open Library: 60 requests / minute), code:ts (export interface CircuitBreakerState {)

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (6): 19. 路线图, v0.1：MVP, v0.2：数据质量, v0.3：中文增强, v0.4：本地索引, v0.5：生态集成

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (6): 1.1 推荐项目名, 1.2 备选项目名, 1. 项目命名, code:text (booknest), code:text (BookNest is an open-source book metadata aggregation service), code:text (BookNest 是一个开源图书元数据聚合服务，支持通过 ISBN 或书名检索图书信息、封面、作者、出版社和版本数据。)

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (6): 2.1 要解决的问题, 2.2 非目标, 2. 项目目标, code:text (书名 / ISBN / 作者 + 书名), code:text (书名、作者、译者、出版社、出版日期、ISBN、语言、页数、简介、封面、版本信息、数据来源、置信度), code:text (多源聚合 + 本地缓存 + 字段级合并 + 候选结果排序 + 用户确认沉淀)

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (6): 20.1 单元测试, 20.2 集成测试, 20.3 测试样本, 20. 测试策略, code:text (fixtures/), code:text (ISBN:)

### Community 33 - "Community 33"
Cohesion: 0.4
Nodes (5): 18.1 README 必须声明, 18.2 Provider Policy, 18. 开源合规策略, code:text (BookNest 默认只启用 Open Library 和 Google Books 等公开 API。), code:text (- 数据来源)

### Community 34 - "Community 34"
Cohesion: 0.4
Nodes (5): 3.1 目标用户, 3.2 产品承诺, 3. 产品定位, code:text (输入 ISBN 或书名，BookNest 聚合多个公开数据源，返回候选结果，并通过本地缓存和用户确认不断提升数据质量。), code:text (输入任意书名都能唯一、准确、完整地匹配一本书。)

### Community 35 - "Community 35"
Cohesion: 0.5
Nodes (4): 4.1 默认稳定数据源, 4.2 中文增强数据源, 4.3 不建议加入默认链路的数据源, 4. 数据源策略

### Community 36 - "Community 36"
Cohesion: 0.67
Nodes (3): 5.1 关键设计原则, 5. 总体架构, code:text (Client)

## Knowledge Gaps
- **290 isolated node(s):** `RecordArgs`, `ALLOWED_PROVIDERS`, `r`, `s`, `ContributorRole` (+285 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `BookNest：开放图书元数据聚合服务设计文档` connect `Community 18` to `Community 14`, `Community 17`, `Community 19`, `Community 20`, `Community 22`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 35`, `Community 36`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `scoreCandidate()` connect `Community 4` to `Community 0`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `Env` connect `Community 2` to `Community 0`, `Community 1`, `Community 12`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `RecordArgs`, `ALLOWED_PROVIDERS`, `r` to the rest of the system?**
  _290 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._