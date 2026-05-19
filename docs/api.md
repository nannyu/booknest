# API 参考

> Base URL: `http://localhost:3000`（默认）。所有 JSON 响应使用 UTF-8。

## 通用约定

### 错误响应

```json
{
  "error": {
    "code": "INVALID_ISBN",
    "message": "not a valid ISBN: xxx",
    "details": {}
  }
}
```

### HTTP 状态码

| 状态 | 含义 |
|---|---|
| 200 | 成功 |
| 201 | 已创建（如 corrections） |
| 400 | 参数错误 |
| 401 | 未授权（corrections 配置了 API Key 时） |
| 404 | Edition / Work 不存在 |
| 413 | 请求体过大 |
| 429 | 限流（上游 Provider 或 corrections IP 限流） |
| 502 / 504 | 上游 Provider 错误 / 超时 |

---

## 1. 搜索图书

```http
GET /api/books/search?q={query}&type={type}&limit={n}&language={lang}
```

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `q` | string | ✓ | — | ISBN、书名、作者或「作者+书名」 |
| `type` | string | | 自动检测 | `isbn` / `title` / `title_author` / `author` |
| `limit` | int | | 20 | 最大 50 |
| `language` | string | | — | ISO 639-1，如 `zh` |

**示例**

```bash
curl 'http://localhost:3000/api/books/search?q=三体&limit=5'
curl 'http://localhost:3000/api/books/search?q=刘慈欣&type=author&limit=10'
```

**响应**

```json
{
  "query": {
    "raw": "三体",
    "queryType": "title",
    "title": "三体",
    "limit": 5
  },
  "results": [
    {
      "id": "abc123",
      "workId": "work_xyz",
      "title": "三体",
      "authors": [{ "name": "刘慈欣", "role": "author" }],
      "isbn13": "9787536692930",
      "confidence": 85,
      "recommended": true,
      "needsReview": false,
      "ephemeral": false,
      "sources": [
        { "name": "google_books", "externalId": "..." },
        { "name": "open_library", "externalId": "..." }
      ]
    }
  ]
}
```

| 字段 | 说明 |
|---|---|
| `workId` | 作品 ID；同书不同 ISBN 可共享 |
| `recommended` | 系统推荐的首条候选 |
| `needsReview` | `confidence < 70` 时建议人工核对 |
| `ephemeral` | `true` 表示未写入 DB，详情深链刷新会 404 |

**queryType 自动检测（未传 `type` 时）**

| 输入 | queryType |
|---|---|
| 10/13 位 ISBN | `isbn` |
| 可拆为「作者 + 书名」 | `title_author` |
| 其他 | `title` |

---

## 2. ISBN 精确查询

```http
GET /api/books/isbn/{isbn}
```

ISBN 自动规范化（去连字符、空格等）。

```bash
curl http://localhost:3000/api/books/isbn/9787536692930
```

**响应**：与搜索相同结构 `{ query, results }`，默认 `limit=5`。

---

## 3. 图书详情

```http
GET /api/books/{editionId}
```

从本地 DB 加载已持久化的 Edition（含贡献者角色、各数据源 externalId）。

```json
{
  "result": {
    "id": "abc123",
    "workId": "work_xyz",
    "title": "三体",
    "authors": [
      { "name": "刘慈欣", "role": "author" },
      { "name": "Ken Liu", "role": "translator" }
    ],
    "confidence": 85,
    "needsReview": false,
    "recommended": false,
    "sources": [{ "name": "open_library", "externalId": "OL..." }]
  }
}
```

> 原始 Provider 响应在 `source_snapshots` 表，供运维/debug；当前 HTTP 接口不返回快照列表（v0.2 可考虑）。

---

## 4. 提交修正

```http
POST /api/corrections
Content-Type: application/json
```

可选：在 `.env` 设置 `CORRECTIONS_API_KEY` 后，须带请求头 `X-Booknest-Api-Key`。

**请求体**

```json
{
  "targetType": "edition",
  "targetId": "abc123",
  "fieldName": "publisher",
  "oldValue": "旧出版社",
  "newValue": "重庆出版社",
  "note": "根据版权页"
}
```

| 字段 | 说明 |
|---|---|
| `targetType` | `edition`（默认）或 `work` |
| `targetId` | 对应表主键 |
| `fieldName` | 要修正的字段名 |
| `newValue` | 新值（必填） |

**响应** `201`

```json
{ "id": "corr_01", "status": "pending" }
```

v0.1 仅写入 `corrections` 表，不自动改 `editions`/`works`。

---

## 5. Provider 状态

```http
GET /api/providers
```

```json
{
  "providers": [
    {
      "name": "open_library",
      "enabled": true,
      "priority": 40,
      "circuitState": "closed",
      "failureCount": 0,
      "lastSuccessAt": "2026-05-19T12:00:00.000Z",
      "lastErrorAt": null
    }
  ]
}
```

---

## 6. 健康检查

```http
GET /healthz
```

```json
{ "status": "ok", "service": "booknest", "version": "0.1.0" }
```

---

## 路线图（尚未实现）

以下端点在 design 文档中有描述，**v0.1 未提供**：

- `POST /api/books/{editionId}/refresh` — 强制清缓存并重新聚合
- `GET /api/providers/status` — 请使用 `GET /api/providers`

---

## 错误码

| code | 说明 |
|---|---|
| `INVALID_ISBN` | ISBN 无效 |
| `INVALID_QUERY` | 搜索参数无效 |
| `NOT_FOUND` | Edition / Work 不存在 |
| `INVALID_CORRECTION` | 修正请求体无效 |
| `UNAUTHORIZED` | corrections API Key 错误 |
| `RATE_LIMITED` | 限流 |
| `PAYLOAD_TOO_LARGE` | 请求体超过 10KB |
| `PROVIDER_*` | 上游 Provider 超时/HTTP 错误 |
