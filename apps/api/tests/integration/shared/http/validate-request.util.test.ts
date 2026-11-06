import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { centsSchema } from '@fincheck/shared/common/money/money.schema.ts';
import { monthQuerySchema } from '@fincheck/shared/common/date/date.schema.ts';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { handleError } from '#/main/http/handle-error.util.ts';
import { validateRequest } from '#/shared/http/validate-request.util.ts';

const bodySchema = z.object({ name: z.string().min(1), amountCents: centsSchema });

const app = new Hono()
  .onError(handleError)
  .post('/items', validateRequest('json', bodySchema), (c) => c.json(c.req.valid('json'), 201))
  .get('/items', validateRequest('query', monthQuerySchema), (c) => c.json(c.req.valid('query')));

const post = (body: unknown) =>
  app.request('/items', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('validateRequest', () => {
  it('lets a valid body through, already typed', async () => {
    const response = await post({ name: 'Mesada', amountCents: 42500 });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ name: 'Mesada', amountCents: 42500 });
  });

  it('answers 400 VALIDATION_FAILED with the path and the message of each field', async () => {
    const response = await post({ name: '', amountCents: 10.5 });

    expect(response.status).toBe(400);
    const body = apiErrorSchema.parse(await response.json());
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.message).toBe('Os dados enviados são inválidos.');
    const issues = (body.details?.['issues'] ?? []) as { path: string; message: string }[];
    expect(issues.map((issue) => issue.path)).toEqual(['name', 'amountCents']);
    expect(issues.every((issue) => issue.message.length > 0)).toBe(true);
  });

  it('validates the query too', async () => {
    const valid = await app.request('/items?month=2026-11');
    const invalid = await app.request('/items?month=2026-13');

    expect(valid.status).toBe(200);
    expect(await valid.json()).toEqual({ month: '2026-11' });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toMatchObject({
      code: 'VALIDATION_FAILED',
      details: { issues: [{ path: 'month' }] },
    });
  });

  it('refuses a body that is not JSON with the same error', async () => {
    const response = await app.request('/items', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'VALIDATION_FAILED' });
  });
});
