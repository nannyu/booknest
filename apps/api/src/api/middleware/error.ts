/**
 * 全局错误中间件。BookNestError → 结构化 JSON。
 * 其他异常 → 500 + 控制台 log。
 */

import type { ErrorHandler } from 'hono';
import { BookNestError } from '@booknest/shared';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof BookNestError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          details: err.details ?? undefined,
        },
      },
      err.status as ContentfulStatusCode,
    );
  }
  // eslint-disable-next-line no-console
  console.error('[unhandled]', err);
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    },
    500,
  );
};
