/**
 * BookNest API 入口。
 *
 * 顺序：env 加载 → 路由挂载 → 错误中间件 → 启动 HTTP server。
 *
 * 路由：
 *   GET  /healthz
 *   GET  /api/books/search?q=...
 *   GET  /api/books/isbn/:isbn
 *   GET  /api/providers
 *   POST /api/corrections
 */

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { logger as honoLogger } from 'hono/logger';
import { errorHandler } from './api/middleware/error.js';
import books from './api/routes/books.js';
import corrections from './api/routes/corrections.js';
import providers from './api/routes/providers.js';
import { env } from './config/env.js';

const app = new Hono();

app.use('*', honoLogger());
app.onError(errorHandler);

// 静态文件（前端页面）。找不到时 fall through 到后续路由
app.use('*', serveStatic({ root: './public' }));

app.get('/healthz', (c) =>
  c.json({ status: 'ok', service: 'booknest', version: '0.1.0' }),
);

app.route('/api/books', books);
app.route('/api/providers', providers);
app.route('/api/corrections', corrections);

app.notFound((c) =>
  c.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404),
);

const port = env.PORT;
serve({ fetch: app.fetch, port }, (info) => {
  // eslint-disable-next-line no-console
  console.log(`booknest listening on http://localhost:${info.port}`);
});

export default app;
