# 贡献指南

感谢你对 BookNest 的关注！这份文档说明本项目的代码风格、提交规范和 PR 流程。

## 开发环境

| 工具 | 版本 |
|---|---|
| Node.js | ≥ 20 (推荐 20 LTS) |
| pnpm | ≥ 9 |
| Docker | ≥ 24（可选，本地起服务用） |

```bash
git clone <repo>
cd booknest
pnpm install
pnpm db:migrate
pnpm dev
```

## 代码规范

### TypeScript

- **严格模式**：`tsconfig.json` 必须打开 `strict: true`
- **不允许 `any`**：用 `unknown` + 类型守卫替代；遇到外部 JSON 用 `z.object(...)` (zod) 解析
- **导出显式类型**：公共函数必须显式标注返回类型
- **命名**：
  - 类型 / 接口 → `PascalCase`
  - 变量 / 函数 → `camelCase`
  - 常量 → `SCREAMING_SNAKE_CASE`
  - 文件名 → `kebab-case.ts`
- **不要写注释解释代码做了什么**——好的命名比注释好。只有以下情况写注释：
  - 解释 **为什么** 这么做（非显然的约束、bug workaround）
  - 标注 `TODO(name): ...` 跟踪未完成项

### 模块结构

- 一个目录只暴露 `index.ts`，外部只能从 `index.ts` import
- Provider 严格按 `providers/<name>/{index,mapper,types}.ts` 组织
- core 模块保持无副作用：纯函数 + 显式注入依赖

### 错误处理

- 业务错误统一 throw `class BookNestError extends Error { code; status; }`
- HTTP 层捕获后转 JSON `{ error: { code, message } }`
- 不要吞错误。fallback 必须 log

### 日志

- 用 `pino`（轻量、结构化）
- 字段：`provider`、`query`、`durationMs`、`cacheHit`、`error.code`
- 不要 log 用户 PII；不要 log 整个 response body（snapshot 已经存了）

## 格式化

```bash
pnpm format        # prettier 一遍
pnpm lint          # eslint 检查
pnpm lint:fix      # eslint 自动修复
pnpm typecheck     # tsc --noEmit
```

CI 会跑 `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test`，本地建议配 pre-commit hook（用 `simple-git-hooks`）。

## 测试

### 测试金字塔

```text
        /\      e2e (curl 真实 HTTP)
       /  \
      /----\   集成（路由 + fake provider）
     /      \
    /--------\  单元（normalize / mapper / score）
```

### 写测试的硬性要求

- **每个 mapper 必须有 fixture-driven 测试**：从 `fixtures/<provider>/*.json` 读真实响应，断言转换后的 `BookCandidate`
- **ISBN 校验、标题归一化** 必须 100% 单元覆盖（这些是聚合逻辑的根基）
- **不允许 mock HTTP layer**：用 `msw` 拦截或者从 fixture 文件读
- **不允许跑真实 Provider API**：CI 不联网，所有集成测试必须基于录制 fixture

### 录 fixture 的工作流

```bash
# 1. 临时写一个一次性脚本调真实 API
node scripts/record-fixture.ts open-library isbn 9787536692930

# 2. 输出到 fixtures/open-library/isbn-9787536692930.json
# 3. 提交进版本控制
# 4. 测试里直接读这个文件
```

## Git 规范

### 分支策略

```text
main              生产分支，受保护
└── feat/...      功能分支
└── fix/...       修复分支
└── chore/...     杂务
└── docs/...      文档
```

### Commit message（Conventional Commits）

```text
<type>(<scope>): <subject>

<body>

<footer>
```

**type**:
- `feat` 新功能
- `fix` 修复
- `refactor` 重构（不改变功能）
- `perf` 性能优化
- `docs` 文档
- `test` 测试
- `chore` 构建/依赖/配置
- `ci` CI 流程

**scope**（可选）：`api` / `core` / `provider:open-library` / `db` / `docs`

**subject**：祈使句，全小写，不加句号，≤ 72 字符。

示例：

```text
feat(provider:open-library): support isbn lookup
fix(core): correct chinese title normalization for punctuation
refactor(db): split schema into per-table files
docs: add api error code table
```

### PR 流程

1. 从 `main` 切分支：`git checkout -b feat/google-books-provider`
2. 提交时跑过 `pnpm lint && pnpm test`
3. PR 标题用 Conventional Commits 格式
4. PR 描述包含：
   - **What**：改了什么
   - **Why**：为什么改
   - **How to test**：怎么验证
5. **不要在 PR 里夹带不相关的格式化变更**
6. CI 全绿后由 maintainer review + squash merge

### 不允许的操作

- `git push --force` 到 `main`
- 跳过 hooks (`--no-verify`)
- 自己 review 自己的 PR
- 合并 CI 红的 PR

## 添加新 Provider 的步骤

1. 在 [docs/provider-policy.md](docs/provider-policy.md) 补充该 Provider 条目
2. 创建 `apps/api/src/providers/<name>/`
3. 实现 `BookProvider` 接口（`searchByISBN` + `searchByTitle`）
4. 写 `mapper.ts`，从原始响应 → `BookCandidate`
5. 录制至少 3 个 fixture（ISBN 命中 / 命中多个 / 未命中）
6. 写 mapper 单元测试
7. 在 `config/providers.ts` 增加 `ProviderConfig`
8. **默认 `enabled: false`**，除非数据源像 Open Library / Google Books 一样无风险
9. 更新 README 数据源表

## 报 bug / 提 feature

- 在 GitHub Issues 提，先搜索是否已有重复
- bug 模板必须包含：复现步骤、期望结果、实际结果、日志/堆栈
- feature 必须先讨论再实现，避免做完发现方向不对

## 行为准则

参与本项目即视为接受 [Contributor Covenant](https://www.contributor-covenant.org/) 行为准则。
