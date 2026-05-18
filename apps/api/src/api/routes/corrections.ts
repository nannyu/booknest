/**
 * 用户修正提交。
 *   POST /api/corrections
 *
 * v0.1：仅写入 corrections 表（status='pending'），不应用到 editions/works。
 * v0.2 才会有审核流程和"接受/拒绝"按钮。
 */

import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { BookNestError } from '@booknest/shared';
import { getDb } from '../../db/client.js';
import { corrections } from '../../db/schema.js';

const router = new Hono();

const correctionSchema = z.object({
  targetType: z.enum(['edition', 'work']).default('edition'),
  targetId: z.string().min(1),
  fieldName: z.string().min(1),
  oldValue: z.string().nullable().optional(),
  newValue: z.string().min(1),
  note: z.string().max(1000).optional(),
});

router.post('/', async (c) => {
  const contentLength = c.req.header('content-length');
  if (contentLength && Number(contentLength) > 10 * 1024) {
    throw new BookNestError('PAYLOAD_TOO_LARGE', 'Request body exceeds 10KB', 413);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = correctionSchema.safeParse(body);
  if (!parsed.success) {
    throw new BookNestError(
      'INVALID_CORRECTION',
      'invalid correction body',
      400,
      parsed.error.flatten(),
    );
  }
  const data = parsed.data;
  const db = getDb();
  const id = nanoid();
  db.insert(corrections)
    .values({
      id,
      targetType: data.targetType,
      targetId: data.targetId,
      fieldName: data.fieldName,
      oldValue: data.oldValue ?? null,
      newValue: data.newValue,
      note: data.note,
      source: 'user',
      status: 'pending',
    })
    .run();
  return c.json({ id, status: 'pending' }, 201);
});

export default router;
