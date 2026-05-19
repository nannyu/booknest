/**
 * 可选 API Key：设置 CORRECTIONS_API_KEY 后，POST /api/corrections 须带 X-Booknest-Api-Key。
 */

import type { Context, Next } from 'hono';
import { BookNestError } from '@booknest/shared';
import { env } from '../../config/env.js';

export async function correctionsAuth(c: Context, next: Next) {
  const required = env.CORRECTIONS_API_KEY;
  if (!required) {
    await next();
    return;
  }
  const provided = c.req.header('x-booknest-api-key');
  if (provided !== required) {
    throw new BookNestError('UNAUTHORIZED', 'invalid or missing X-Booknest-Api-Key', 401);
  }
  await next();
}
