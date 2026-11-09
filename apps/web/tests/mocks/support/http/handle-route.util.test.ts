import { describe, expect, it } from 'vitest';

import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

const WELL_FORMED_MISSING_ID = '0194f3a0-0000-7000-8000-00000000ffff';

describe('handleRoute path ids', () => {
  it.each(['/accounts/abc', '/transactions/abc', '/bills/abc', '/recurrences/abc'])(
    'answers 400 VALIDATION_FAILED for a malformed id in %s, as the API does',
    async (path) => {
      const { status, json } = await callApi('GET', path);

      expect(status).toBe(400);
      expect(json).toMatchObject({ code: 'VALIDATION_FAILED' });
    },
  );

  it('answers 404 for a well-formed id that does not exist', async () => {
    const { status } = await callApi('GET', `/accounts/${WELL_FORMED_MISSING_ID}`);

    expect(status).toBe(404);
  });

  it('checks every id of the path, not only :id', async () => {
    const { status } = await callApi('GET', '/cards/abc/invoices/2026-10');

    expect(status).toBe(400);
  });
});
