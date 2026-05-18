# API 参考

> Base URL: `http://localhost:3000` (默认)。所有 JSON 响应都使用 UTF-8 编码。

## 通用约定

### 响应包装

成功响应直接返回数据对象。错误响应：

```json
{
  "error": {
    "code": "INVALID_ISBN",
    "message": "ISBN 校验失败：长度不对"
  }
}
```

### HTTP 状态码

| 状态 | 含义 |
|---|---|
| 200 | 成功 |
| 400 | 参数错误（ISBN 格式、缺参数等） |
| 404 | 未找到（Edition、Work） |
| 429 | 上游 Provider 限流 |
| 503 | 所有 Provider 都失败且无缓存 |

## 1. 搜索图书

```http
GET /api/books/search?q={query}&limit={n}&language={lang}
```

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `q` | string | ✓ | — | 书名、ISBN、或 "作者 书名" |
| `limit` | int | | 10 | 候选数上限，最大 50 |
| `language` | string | | — | ISO 639-1，如 `zh` / `en` |

**示例**

```bash
curl 'http://localhost:3000/api/books/search?q=三体&limit=5'
```

**响应**

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
      "pageCount": 302,
      "coverUrl": "https://covers.openlibrary.org/b/isbn/9787536692930-L.jpg",
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

**queryType 自动识别**

| 输入特征 | queryType |
|---|---|
| 仅数字（10/13 位） | `isbn` |
| 单个词或短语 | `title` |
| 包含空格、能拆出可能作者 | `title_author` |

## 2. ISBN 精确查询

```http
GET /api/books/isbn/{isbn}
```

ISBN 自动清洗：去掉空格、连字符、`ISBN` 前缀、全角字符。

**示例**

```bash
curl http://localhost:3000/api/books/isbn/978-7-5366-9293-0
# 等价于
curl http://localhost:3000/api/books/isbn/9787536692930
```

**响应**：与搜索结果中单条 Edition 结构一致。`needsReview: true` 表示多源返回字段冲突大，建议人工核对。

## 3. 获取图书详情

```http
GET /api/books/{editionId}
```

返回完整的 Edition 数据，包含 Work 信息、所有贡献者、所有 source_snapshots 摘要。

## 4. 提交修正

```http
POST /api/books/{editionId}/corrections
Content-Type: application/json
```

**请求体**

```json
{
  "field": "publisher",
  "value": "重庆出版社",
  "note": "根据实体书版权页修正"
}
```

**支持的 field**

- `title` / `subtitle` / `publisher` / `publishedDate`
- `isbn10` / `isbn13`
- `pageCount` / `language` / `description`
- `coverUrl`

**响应**

```json
{
  "id": "correction_01HXYZ",
  "status": "pending"
}
```

修正默认进入 `pending`，待管理员审核或自动通过（取决于配置）。审核通过后才覆盖 `editions` 表对应字段。

## 5. 触发重新聚合

```http
POST /api/books/{editionId}/refresh
```

清掉该 ISBN 的 `search_cache`、重新调用所有启用的 Provider 并合并。用于：

- 上游数据更新后强制刷新
- 用户报告字段不对，重新拉取再合并

## 6. Provider 健康状态

```http
GET /api/providers/status
```

**响应**

```json
{
  "providers": [
    {
      "name": "open_library",
      "enabled": true,
      "healthy": true,
      "circuitState": "closed",
      "lastSuccessAt": "2026-05-18T10:00:00Z",
      "lastErrorAt": null,
      "rateLimit": { "limit": 60, "remaining": 58 }
    },
    {
      "name": "google_books",
      "enabled": true,
      "healthy": true,
      "circuitState": "closed",
      "lastSuccessAt": "2026-05-18T10:01:00Z",
      "lastErrorAt": "2026-05-18T09:45:23Z",
      "rateLimit": { "limit": 60, "remaining": 60 }
    }
  ]
}
```

## 7. 健康检查

```http
GET /healthz
```

返回 `{"status": "ok"}`，用于容器健康检查 / 负载均衡探活。

---

## 错误码表

| code | 说明 |
|---|---|
| `INVALID_ISBN` | ISBN 校验失败 |
| `MISSING_QUERY` | 缺少 `q` 参数 |
| `EDITION_NOT_FOUND` | Edition 不存在 |
| `ALL_PROVIDERS_FAILED` | 所有启用的 Provider 都失败 |
| `RATE_LIMITED` | 上游 Provider 限流 |
| `INVALID_FIELD` | 修正字段不在白名单 |
