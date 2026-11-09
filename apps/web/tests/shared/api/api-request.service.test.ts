import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { accountDtoSchema } from '@fincheck/shared/accounts/account/account.schema.ts';
import {
  listTransactionsQuerySchema,
  transactionDtoSchema,
} from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { createBillRequestSchema, billDtoSchema } from '@fincheck/shared/bills/bill/bill.schema.ts';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '#mocks/setup/server.util.ts';
import type { ApiError } from '#/shared/api/api.error.ts';
import { CLIENT_ERROR_CODES, hasApiErrorCode, isApiError } from '#/shared/api/api.error.ts';
import { apiRequest } from '#/shared/api/api-request.service.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

const MISSING_ID = '0194f3a0-0000-7000-8000-999999999999';

async function caught(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to fail');
}

describe('apiRequest', () => {
  it('reads a route and validates the answer with the response schema', async () => {
    const answer = await apiRequest({
      method: 'GET',
      path: '/accounts',
      responseSchema: listResponseSchema(accountDtoSchema),
    });

    expect(answer.items.length).toBeGreaterThan(0);
  });

  it('sends the query as text and no token (the dev proxy adds it)', async () => {
    let seen: { token: string | null; search: string } | undefined;
    server.use(
      http.get('/api/transactions', ({ request }) => {
        seen = {
          token: request.headers.get('X-Fincheck-Token'),
          search: new URL(request.url).search,
        };

        return HttpResponse.json({ items: [], nextCursor: null });
      }),
    );

    await apiRequest({
      method: 'GET',
      path: '/transactions',
      querySchema: listTransactionsQuerySchema,
      query: { month: '2026-10', uncategorized: true },
    });

    expect(seen?.token).toBeNull();
    expect(seen?.search).toBe('?month=2026-10&uncategorized=true');
  });

  it('turns an API error into an ApiError with the contract code', async () => {
    const error = await caught(
      apiRequest({
        method: 'GET',
        path: `/transactions/${MISSING_ID}`,
        responseSchema: transactionDtoSchema,
      }),
    );

    expect(isApiError(error)).toBe(true);
    expect(error).toMatchObject({ status: 404, code: 'TRANSACTION_NOT_FOUND' });
    expect(hasApiErrorCode(error, 'TRANSACTION_NOT_FOUND')).toBe(true);
    expect(hasApiErrorCode(error, 'BILL_NOT_FOUND')).toBe(false);
  });

  it('does not send a body outside the request schema', async () => {
    let called = false;
    server.use(
      http.post('/api/bills', () => {
        called = true;

        return HttpResponse.json({}, { status: 201 });
      }),
    );

    const error = await caught(
      apiRequest({
        method: 'POST',
        path: '/bills',
        bodySchema: createBillRequestSchema,
        // @ts-expect-error a body the schema refuses
        body: { description: '' },
        responseSchema: billDtoSchema,
      }),
    );

    expect(called).toBe(false);
    expect(error).toMatchObject({ status: 0, code: CLIENT_ERROR_CODES.requestInvalid });
    expect((error as ApiError).details?.['issues']).toBeInstanceOf(Array);
  });

  it('refuses an answer outside the response schema', async () => {
    server.use(http.get('/api/accounts', () => HttpResponse.json({ items: [{ id: 1 }] })));

    const error = await caught(
      apiRequest({
        method: 'GET',
        path: '/accounts',
        responseSchema: listResponseSchema(accountDtoSchema),
      }),
    );

    expect(error).toMatchObject({ code: CLIENT_ERROR_CODES.responseInvalid });
  });

  it('answers undefined on 204 and UNKNOWN_ERROR for an error without the contract body', async () => {
    server.use(
      http.delete('/api/accounts/x', () => new HttpResponse(null, { status: 204 })),
      http.get('/api/health-x', () => new HttpResponse('boom', { status: 502 })),
    );

    await expect(apiRequest({ method: 'DELETE', path: '/accounts/x' })).resolves.toBeUndefined();
    const error = await caught(apiRequest({ method: 'GET', path: '/health-x' }));
    expect(error).toMatchObject({ status: 502, code: CLIENT_ERROR_CODES.unknown });
  });

  it('reports a network failure as NETWORK_ERROR', async () => {
    server.use(http.get('/api/accounts', () => HttpResponse.error()));

    const error = await caught(apiRequest({ method: 'GET', path: '/accounts' }));

    expect(error).toMatchObject({ status: 0, code: CLIENT_ERROR_CODES.network });
  });
});
