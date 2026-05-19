# BookNest

> 开源图书元数据聚合服务 — 输入 ISBN 或书名，聚合 Open Library / Google Books 等公开数据源，返回封面、作者、出版社、版本等结构化信息。

[![Status](https://img.shields.io/badge/status-MVP-orange)]()
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

BookNest is an open-source book metadata aggregation service for ISBN and title search. 它解决的不是"调一个 API 查一本书"，而是把多个不完整、碎片化的公开书目源聚合、归一化、合并、排序，最终返回可信的候选结果。

---

## ✨ 特性

- 🔍 **ISBN 精确查询** — 支持 ISBN-10/13 清洗、校验、多源聚合
- 📚 **书名/作者搜索** — 中文标题归一化 + 候选评分，不强行唯一匹配
- 🌐 **多源聚合** — 默认 Open Library + Google Books，可扩展 Crossref/LoC/中文增强源
- 🧠 **字段级合并** — 不同来源在不同字段上可信度不同，按字段优先级合并
- 💾 **本地缓存** — SQLite 缓存，保护免费 API、降低延迟
- 🧩 **Work / Edition 分离** — 区分作品概念和具体版本
- 📝 **人工修正** — Correction API 持续提升数据质量
- 🐳 **一键部署** — Docker Compose 即可启动

## 🚀 快速开始

### 本地开发

```bash
# 安装依赖
pnpm install

# 初始化数据库
pnpm db:migrate

# 启动开发服务器（会自动构建前端 CSS，不依赖 Tailwind CDN）
pnpm dev

# 服务默认监听 http://localhost:3000
```

### Docker

```bash
docker compose up -d
```

### 体验一下

```bash
# ISBN 查询
curl http://localhost:3000/api/books/isbn/9787536692930

# 书名搜索
curl 'http://localhost:3000/api/books/search?q=三体&limit=5'

# 作者+书名
curl 'http://localhost:3000/api/books/search?q=刘慈欣%20三体'

# Provider 健康状态
curl http://localhost:3000/api/providers/status
```

## 📖 文档

| 文档 | 说明 |
|---|---|
| [架构设计](docs/architecture.md) | 模块划分、数据流、关键设计原则 |
| [API 参考](docs/api.md) | REST API 接口说明 |
| [Provider 策略](docs/provider-policy.md) | 数据源使用与合规说明 |
| [开发规范](CONTRIBUTING.md) | 代码风格、提交规范、PR 流程 |
| [完整设计文档](booknest_design.md) | 包含产品定位、路线图等完整设计 |

## 🏗️ 项目结构

```text
booknest/
├── apps/
│   └── api/                  # Hono API 服务
│       ├── src/
│       │   ├── api/routes/   # HTTP 路由
│       │   ├── core/         # 路由调度、合并、评分、缓存
│       │   ├── providers/    # 数据源 Provider
│       │   ├── db/           # Drizzle schema + 迁移
│       │   └── server.ts     # 入口
│       └── test/             # 单元/集成测试
├── packages/
│   └── shared/               # 跨包共享类型与工具
├── docs/                     # 项目文档
├── fixtures/                 # 录制的 API 响应（用于测试）
├── docker-compose.yml
└── README.md
```

## 🌟 支持的数据源

### 默认启用（合规、稳定）

| Provider | 用途 | 是否需要 Key |
|---|---|---|
| **Open Library** | ISBN、封面、批量 dump | 否 |
| **Google Books** | 搜索召回、封面、简介 | 可选 |

### 可选启用

| Provider | 用途 | 状态 | 备注 |
|---|---|---|---|
| **Crossref** | 学术专著、教材、会议论文 | ✅ 已实现 | 无需 key；polite pool 建议带 mailto |
| **Library of Congress** | 英文权威馆藏 | ✅ 已实现 | 无需 key，`?fo=json` 即返 JSON |
| **商业 ISBN 服务** | ISBNdb / API Ninjas / 自托管 | ✅ 已实现 | 内置 2 个 preset，需 API key |
| NLC OPAC | 中国国家图书馆 | ⚠️ 未实现 | ALEPH 系统，存在会话/IP 限制 |
| CALIS | 高校联合书目 | ⚠️ 未实现 | React SPA，需逆向 JS bundle |
| PDC | 中国国家版本数据中心 | ⚠️ 未实现 | 暂未找到稳定公开端点 |
| WorldCat | 全球图书馆联合目录 | ⚠️ 未实现 | OCLC 免费 API 已于 2024-12 停用 |

启用方式：在 `.env` 中设置 `ENABLE_CROSSREF=true` / `ENABLE_LOC=true` 即可。商业 ISBN 服务额外需要 `COMMERCIAL_ISBN_PRESET` + `COMMERCIAL_ISBN_API_KEY`（详见 [docs/provider-policy.md](docs/provider-policy.md)）。其他 Provider 已在 `config/providers.ts` 中预留位置，待上游接口稳定后再补实现。

> ⚠️ **合规声明**：BookNest 默认只调用 Open Library 与 Google Books 等公开 API。中文增强 Provider 可能访问第三方公开检索页面，**默认全部关闭**，使用者需自行确认目标站点的服务条款。本项目**不包含**豆瓣、京东、当当、淘宝、微信读书等商业平台的抓取逻辑。

## 🛣️ 路线图

- [x] **v0.1 MVP** — Open Library + Google Books、ISBN/书名查询、SQLite 缓存、Docker Compose
- [ ] **v0.2 数据质量** — Work/Edition 模型、源快照、修正 API、熔断限流
- [ ] **v0.3 中文增强** — NLC OPAC、CALIS、出版社别名、作者角色识别
- [ ] **v0.4 本地索引** — Open Library dump 导入、FTS5、定期 refresh
- [ ] **v0.5 生态集成** — MCP Server、CLI、JS/Python SDK、Web 后台

详见 [设计文档第 19 章](booknest_design.md#19-路线图)。

## 🤝 贡献

欢迎贡献！请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，了解代码风格、提交信息规范和 PR 流程。

新人推荐的第一批 issue 见设计文档第 23 章。

## 📜 License

MIT © BookNest Contributors. 详见 [LICENSE](LICENSE)。
