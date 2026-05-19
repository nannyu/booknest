# Provider 策略

> 本文档说明每个 Provider 的数据来源、使用条件、合规注意事项。**新增 Provider 必须先补充本文档**。

## 通用原则

1. **默认只启用低风险公开 API**（Open Library、Google Books）
2. **可选 Provider 默认关闭**，需要使用者通过环境变量显式启用
3. **每个 Provider 必须设置 User-Agent**，通过 `APP_USER_AGENT` 环境变量统一指定
4. **遵守上游限流约定**，本地用令牌桶强制实施
5. **不抓取商业平台**（豆瓣、京东、当当、淘宝、微信读书等）
6. **保存原始响应快照** 到 `source_snapshots`，方便追溯

---

## Open Library

| 项 | 值 |
|---|---|
| 数据来源 | https://openlibrary.org/ |
| 官方文档 | https://openlibrary.org/developers/api |
| 默认启用 | ✅ |
| 是否需要 Key | 否 |
| 允许缓存 | ✅ |
| 建议频率 | ≤ 60 req/min |
| Cache TTL | 90 天 |

### 使用接口

```text
GET https://openlibrary.org/isbn/{isbn}.json
GET https://openlibrary.org/search.json?q={q}&limit={n}
GET https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg
```

### 已知限制

- 中文书覆盖率较低
- `published_date` 格式不统一，需要 mapper 兼容
- `author_name` 字段在 search 接口中是数组的数组结构

### 合规注意

- 上游为 Internet Archive 维护，CC0 协议，可自由使用
- 仍需声明 `User-Agent` 与联系邮箱（参考 polite usage）

---

## Google Books

| 项 | 值 |
|---|---|
| 数据来源 | https://www.googleapis.com/books/v1/ |
| 官方文档 | https://developers.google.com/books |
| 默认启用 | ✅ |
| 是否需要 Key | 可选（无 key 仅匿名配额，约 1000 req/day） |
| 允许缓存 | ✅ |
| 建议频率 | ≤ 60 req/min |
| Cache TTL | 30 天 |

### 使用接口

```text
GET https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}
GET https://www.googleapis.com/books/v1/volumes?q={q}
```

### 已知限制

- 部分中文书简介为机翻
- `publishedDate` 可能只到年份
- ISBN 必须用 `q=isbn:9787...` 这种格式

### 合规注意

- 商用建议申请 API Key
- 不允许长期镜像/批量下载封面（仅按用户查询展示）

---

## Crossref（可选）

| 项 | 值 |
|---|---|
| 数据来源 | https://api.crossref.org/ |
| 官方文档 | https://www.crossref.org/documentation/retrieve-metadata/rest-api/ |
| 默认启用 | ❌ |
| 实现状态 | ✅ 已实现（v0.1） |
| 是否需要 Key | 否（强烈建议提供 `mailto`） |
| 允许缓存 | ✅ |
| 建议频率 | polite pool（提供 mailto 后获得更优配额） |
| Cache TTL | 90 天 |

### 适用场景

学术书、教材、章节级元数据、DOI 查询。**注意**：Crossref 主要收录论文/会议章节，对大众小说覆盖差。

### 已知限制

- ISBN 查询对非学术书几乎都是 0 结果
- 标题搜索经常返回 book-chapter 而非完整 book
- 中文小说几乎无收录

### 合规注意

`User-Agent` 必须包含 `mailto`（已通过 `APP_CONTACT_EMAIL` 自动拼接），否则会被降级到 public pool。

---

## Library of Congress（可选）

| 项 | 值 |
|---|---|
| 数据来源 | https://www.loc.gov/ |
| 官方文档 | https://www.loc.gov/apis/json-and-yaml/ |
| 默认启用 | ❌ |
| 实现状态 | ✅ 已实现（v0.1） |
| 是否需要 Key | 否 |
| 允许缓存 | ✅ |
| Cache TTL | 90 天 |

### 使用接口

```text
GET https://www.loc.gov/books/?q={query}&fo=json
```

任意 LOC 搜索页 URL 后加 `?fo=json` 即返 JSON，**无需 key**。

### 已知限制

- 中文书覆盖极弱（以英文馆藏为主）
- 搜索为全文关键词匹配，相关度偏低
- 适合作为英文公版书、LCCN 查询的兜底源

---

## NeoDB（可选）

| 项 | 值 |
|---|---|
| 数据来源 | `NEODB_INSTANCE_URL`（默认 https://neodb.social） |
| 官方文档 | https://neodb.net/api/ |
| 源码 | https://github.com/neodb-social/neodb（AGPL-3） |
| 默认启用 | ❌ |
| 实现状态 | ✅ 已实现 |
| 是否需要 Key | 否（搜索 endpoint 公开，无需 OAuth） |
| 允许缓存 | ✅ |
| Cache TTL | 60 天 |
| 建议频率 | ≤ 30 req/min（NeoDB 实例自维护，礼貌使用） |

### 使用接口

```text
GET {NEODB_INSTANCE_URL}/api/catalog/search?query={q}&category=book&page=1
```

无认证；可选 `Authorization: Bearer {NEODB_API_TOKEN}` 走 polite pool 获得更高 rate limit（需在 NeoDB 实例注册 app 跑一次 OAuth）。

### 适用场景

- **中文图书简介**（核心价值）—— NeoDB 整合了多源（OpenLibrary、Wikidata、ActivityPub 联邦实例、用户众包）的中文元数据，简介质量通常优于 OL/GB
- 中文 `publisher` 列表（OL/GB 通常只给英文/拼音版）
- 中文 `translator` 信息
- 当前 `description` 字段 FIELD_PRIORITY 已把 NeoDB 排在 OL/GB 之上

### 已知限制

- 数据**众包，质量无保证**（NeoDB 官方明示）
- `neodb.social` 在部分网络环境不可达；可通过 `NEODB_INSTANCE_URL` 改指自托管或社区实例
- AGPL-3 license：仅作为远程 API 调用合规；如要 fork / 嵌入 NeoDB 服务端代码需自查兼容性

### 合规注意

NeoDB 的元数据来源包含豆瓣等（用户驱动 import 行为），但 BookNest 调用的是 NeoDB 自身的合规 API，**不属于"BookNest 抓取豆瓣"**——类比 Open Library 也整合多源。

---

## NLC OPAC / 中国国家图书馆（可选，**高风险**）

| 项 | 值 |
|---|---|
| 数据来源 | https://www.nlc.cn/ |
| 默认启用 | ❌ |
| 实现状态 | ❌ **暂未实现** |
| 是否需要 Key | 不适用 |
| 允许缓存 | 建议强缓存 |
| 建议频率 | ≤ 6 req/min |

### 暂未实现原因（v0.1）

- NLC OPAC 是基于 ALEPH 500 的系统，URL 中含动态会话 token
- 部分网络环境（含本机调试）直接访问返回空响应
- 没有稳定可解析的搜索结果页结构
- 真要实现需要浏览器渲染或 Z39.50 网关，超出 v0.1 范围

### 合规注意

- 本质是 HTML 检索页解析，**没有正式开放 API**
- 启用前需自行评估服务条款
- 高频/批量访问可能违反站点 robots / 反爬规则
- 仅建议低频补全使用，**不可作为主数据源**

> ⚠️ 启用此 Provider 责任由使用者自行承担。BookNest 项目不为此类访问背书。

---

## CALIS 联合目录（可选，**高风险**）

| 项 | 值 |
|---|---|
| 数据来源 | https://opac2.calis.edu.cn/ |
| 默认启用 | ❌ |
| 实现状态 | ❌ **暂未实现** |
| 建议频率 | ≤ 6 req/min |

### 暂未实现原因（v0.1）

- CALIS 公共检索系统是基于 UMI / React 的 SPA
- 搜索结果由前端 JS 动态渲染，无 SSR
- 解析需逆向 JS bundle 找到 API 端点，或使用无头浏览器
- 工作量与稳定性都不符合 v0.1 范围

### 适用场景

中文学术书、教材、古籍。

### 合规注意

HTML/SPA 解析，需自行评估服务条款。

---

## PDC / 国家版本数据中心（可选，**手动**）

| 项 | 值 |
|---|---|
| 数据来源 | https://pdc.capub.cn/ |
| 默认启用 | ❌ |
| 实现状态 | ❌ **暂未实现** |
| 自动化友好度 | 极低 |

### 暂未实现原因（v0.1）

- 站点暴露的 `search-api` 路径返回 404
- 未找到稳定可用的公开端点
- 设计文档预期"权威性强但自动化友好度低"，与实测一致

### 建议

- 不进入默认自动链路
- 仅作为人工核对依据，结合 Correction API 录入
- 或定期导出 CSV 后离线导入

---

## WorldCat（不接入）

| 项 | 值 |
|---|---|
| 数据来源 | https://www.worldcat.org/ |
| 实现状态 | ❌ **不接入** |

### 不接入原因

- WorldCat Search API v1.0 已于 **2024-12-31** 停止服务
- WorldCat Metadata API v2 / Search API v2 需要 OCLC 机构会员订阅，无免费层
- 历史的 xISBN / Classify 服务在 2025 年也均已下线或不稳定
- 没有合规、免费、稳定的接入路径，**v0.2+ 不考虑**

---

## 商业 ISBN Provider（可选，需 API key）

| 项 | 值 |
|---|---|
| 数据来源 | 由 `COMMERCIAL_ISBN_PRESET` 决定 |
| 默认启用 | ❌ |
| 实现状态 | ✅ 已实现（v0.1） |
| 是否需要 Key | ✅ 必填 |
| 允许缓存 | ✅ |
| Cache TTL | 90 天 |

### 内置 preset

| preset | URL 模板 | 认证 header | 文档 |
|---|---|---|---|
| `isbndb` | `https://api2.isbndb.com/book/{isbn}` | `Authorization: {key}` | https://isbndb.com/api/v2/docs |
| `api_ninjas` | `https://api.api-ninjas.com/v1/isbn?isbn={isbn}` | `X-Api-Key: {key}` | https://api-ninjas.com/api/isbn |

`COMMERCIAL_ISBN_API_URL` 可选；填了会覆盖 preset 的默认 endpoint（用于自托管或代理场景）。

### 配置示例

```env
ENABLE_COMMERCIAL_ISBN=true
COMMERCIAL_ISBN_PRESET=isbndb
COMMERCIAL_ISBN_API_KEY=YOUR_KEY
```

### 已知限制

- v0.1 只实现 ISBN 精确查询；不支持书名搜索（多数商业服务不提供或限制严格）
- 不同 preset 的响应字段覆盖度不同：ISBNdb 通常包含封面/简介/分类，API Ninjas 字段较少
- 如要接入新服务商，扩展 `apps/api/src/providers/commercial-isbn/presets.ts` 即可

### 合规注意

- 商业服务的服务条款（ToS）由使用者自行确认（缓存、再分发权限等）
- 不允许把商业服务的批量数据回传到公开仓库或长期镜像
- 默认关闭；启用代表使用者已同意服务商 ToS

---

## ❌ 明确不接入的数据源

| 数据源 | 原因 |
|---|---|
| 豆瓣（含非官方接口） | 不稳定、合规风险高 |
| 京东 / 当当 / 淘宝 | 商品页，非开放书目源，反爬严重 |
| 微信读书 | 平台封闭 |
| 个人维护的 ISBN API | 长期可用性无保证 |

---

## 新增 Provider 检查清单

接入新 Provider 前，确认：

- [ ] 数据源有明确的开放许可证或官方 API
- [ ] 已补充本文档对应条目
- [ ] 设置了 `enabled: false`（除非数据源极其可信）
- [ ] 设置了 `rateLimitPerMinute` 与上游约束一致
- [ ] `User-Agent` 透传 `APP_USER_AGENT`
- [ ] 错误响应有合理超时 (`timeoutMs`)
- [ ] mapper 有单元测试 + fixture
- [ ] README 数据源表已同步更新
