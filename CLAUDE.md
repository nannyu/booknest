# CLAUDE.md — BookNest 项目级指令

> 这份文件是给未来接手项目的 Claude / 其他 AI agent 看的。读完它你应该能立刻上手开发，而不是从头读 28KB 的设计文档。

## 项目一句话

BookNest 是一个**开源图书元数据聚合服务**：输入 ISBN / 书名 / 作者 → 并发查 Open Library + Google Books（+ 可选 Crossref / LOC / 商业 ISBN）→ 字段级合并 + 评分 → 落库 + 返回候选 Edition。

## 必读三件套（按顺序）

1. [README.md](README.md) — 项目目标 + 快速跑起来
2. [docs/architecture.md](docs/architecture.md) — 模块划分 + 数据流
3. [CONTRIBUTING.md](CONTRIBUTING.md) — 代码风格 + 提交规范

完整产品/技术决策在 [booknest_design.md](booknest_design.md)，需要细节时再查。

## 技术栈

- Node 20+, TypeScript, ESM
- Web: **Hono**（轻量、edge 友好）
- DB: **SQLite + Drizzle ORM**（个人部署门槛低；可切 Postgres）
- 测试: **Vitest** + `msw` for HTTP mocking + fixtures
- 包管理: **pnpm workspaces**
- 校验: **zod**（环境变量 + 外部 API 响应）

## 仓库布局

```text
apps/api/src/
  api/routes/   ← HTTP 层（薄，只做参数校验+调用 core）
  core/         ← 业务核心（无副作用、可单测）
    router.ts        # 编排：cache → provider → merge → score → persist
    merge.ts         # 字段级合并
    score.ts         # queryType-aware + 多源共识 + 完整度
    cache.ts / rate-limit.ts / circuit-breaker.ts
    persist.ts       # MergedCandidate → works / editions / ...
    load.ts          # editionId → RankedBook（详情页）
  providers/    ← 数据源适配（一个目录一个 provider）
  db/           ← Drizzle schema + 迁移
  config/       ← env + providerConfigs
  lib/          ← http.ts + provider-fetch.ts
  public/       ← 前端单页（hash 路由 + 详情视图）
  server.ts     ← Hono app 入口

packages/shared/  ← 跨包共享类型（BookCandidate、ISBN 工具）
fixtures/         ← 真实 API 响应录制（驱动测试）
docs/             ← 架构 / API / Provider 策略
```

## 关键不变量（修改前务必读这里）

### 数据模型铁律

- **Work ≠ Edition**：作品 vs 版本。译者不同、出版社不同、ISBN 不同 → 不同 Edition
- **ISBN 是 Edition 的标识，不是 Work 的标识**
- **不要把同 Work 不同 Edition 强行合并到一行**
- **Work 关联**：`persist` 按 `normalizedTitle + 第一作者` 复用 `work_id`；不同 ISBN/出版社/译者仍是独立 Edition

### 流程铁律

- **先查缓存，再查 Provider**（永远）。`search_cache` 表 + sha256 key
- **Provider 并发但隔离**：一个超时/失败不影响其他源
- **保存 source_snapshots**：每次 Provider 命中都存 raw JSON
- **字段级合并**：按 `core/merge.ts` 里的 `fieldPriority` 表，不是简单覆盖

### 合规铁律

- **默认只启用 Open Library + Google Books**
- **不要新增豆瓣/京东/当当/淘宝/微信读书 Provider**——这是产品定位红线
- **中文增强源（NLC/CALIS/PDC）默认 `enabled: false`**，需用户显式开
- 任何 HTTP 请求必须带 `APP_USER_AGENT`（包含 mailto）

## 常见任务的"对的做法"

### 新增一个 Provider

1. 读 [docs/provider-policy.md](docs/provider-policy.md) 评估合规性
2. 实现 `providers/<name>/{index.ts, mapper.ts, types.ts}`
3. 录 fixture 到 `fixtures/<name>/`
4. 写 mapper 测试，**至少覆盖**：ISBN 命中、多结果、空结果、字段缺失
5. 在 `config/providers.ts` 加 `ProviderConfig`，**默认 `enabled: false`**
6. 更新 [docs/provider-policy.md](docs/provider-policy.md) 和 [README.md](README.md) 的数据源表

### 修一个字段合并 bug

1. 复现：找一对 fixture（哪两个源、什么字段冲突）
2. 在 `core/merge.test.ts` 加一个对应 case
3. 改 `core/merge.ts` 让测试过
4. **不要**改其他不相关的合并逻辑

### 调整评分

1. `core/score.ts` 是纯函数，必须可单测；接受 `MergedCandidate`，不是 `BookCandidate`
2. 现行公式（4 个模块）：
   - ISBN 命中 +60
   - queryType-aware 相似度：title/author 权重按 queryType 不同（isbn 20/10、title 50/10、title_author 30/30、author 10/60）
   - 多源共识：2 源 +10、3 源 +15、4+ 源 +20
   - 完整度：authors/publisher/publishedDate/description 各 +3，pageCount/language/categories 各 +2，cover +3
3. 阈值：`recommended ≥ 80`、`needsReview < 60`（基于 50 ISBN 实测分布定的，**不要随手调**）
4. 改完跑 `pnpm test core/score` 看 baseline 测试不退化
5. 真有理由调权重，在 commit message / PR 描述里说清楚

### 改 schema

1. **绝对不要直接改 `db/schema.ts` 然后 push**——必须出新迁移
2. `pnpm db:generate` 生成迁移 SQL
3. 检查生成的 SQL 是否符合预期（drizzle-kit 偶尔会乱）
4. 迁移文件名格式：`NNNN_<verb>_<noun>.sql`

## "不要这么做"清单

❌ **不要 mock 数据库去测合并逻辑**——直接拿 fixture 跑 in-memory SQLite
❌ **不要在路由层写业务逻辑**——路由只做参数解析、调 core、返回
❌ **不要把外部 API 响应直接返给用户**——必须先 mapper 转成 `BookCandidate`
❌ **不要写大段 try-catch 把错误吞掉**——业务错误 throw `BookNestError`，HTTP 层统一处理
❌ **不要为"以后可能要"加抽象**——三处相似代码 < 一个早期抽象
❌ **不要写大段 docstring/注释解释代码做什么**——好命名即可，注释只解释 *为什么*

## 起服务的 happy path

```bash
pnpm install
cp .env.example .env
pnpm db:migrate
pnpm dev              # 自动 build:css → tsx watch apps/api/src/server.ts
# 另一个终端
curl http://localhost:3000/healthz
curl http://localhost:3000/api/books/isbn/9787536692930
curl 'http://localhost:3000/api/books/search?q=刘慈欣&type=author'
# 前端
open http://localhost:3000/
```

## 跑测试

```bash
pnpm test             # 全量
pnpm test --filter @booknest/api      # 只跑 api
pnpm test core/score                  # 模糊匹配
pnpm test --coverage
```

## 当前阶段

**v0.1 已交付**：
- ISBN / 书名 / **作者** / 作者+书名 四种查询
- Provider：Open Library + Google Books 默认开；Crossref + LOC + 商业 ISBN (ISBNdb/API Ninjas) 可选
- 完整持久化（works / editions / contributors / edition_sources / external_identifiers）
- 详情页 `GET /api/books/:id` + 前端 hash 路由
- 评分：queryType-aware + 多源共识 + 完整度
- 缓存 / 限流 / 熔断 / 错误隔离
- SQLite + Drizzle + WAL，本地化部署
- 单页前端（无 SPA 框架，原生 JS + Tailwind 本地构建）

后续路线图见 [README.md#路线图](README.md#-路线图)。

**不要超前做** v0.2 才有的修正流自动应用、状态面板、Open Library dump 导入——这些是有意推迟的。

## 用户偏好（追加在这里）

> 接手时如果用户给了新约定/纠正，加到这下面。每条 ≤ 2 行。

<!-- (empty for now) -->
