import { ruleSuggestionDtoSchema } from '@fincheck/shared/categories/rule-suggestion/rule-suggestion.schema.ts';
import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

function categoryId(): string {
  return db.categories.find((item) => item.kind === 'expense' && !item.archivedAt)?.id ?? '';
}

function movePurchases(descriptions: string[]): void {
  for (const description of descriptions) {
    db.transactions.push(
      makeTransactionRecord({
        accountId: db.accounts.find((account) => account.type === 'checking')?.id ?? '',
        method: 'pix',
        description,
        amountCents: -1500,
        occurredOn: TODAY,
        categoryId: categoryId(),
        categorySource: 'user',
      }),
    );
  }
}

async function suggestions() {
  return listResponseSchema(ruleSuggestionDtoSchema).parse(
    (await callApi('GET', '/rule-suggestions')).json,
  ).items;
}

describe('rule suggestions (mock vs api 21, 24, 34, 41)', () => {
  it('groups the installments of a purchase under the description without the "n/N"', async () => {
    movePurchases(['LOJA PARCELADA 1/3', 'LOJA PARCELADA 2/3', 'LOJA PARCELADA 3/3']);

    const found = (await suggestions()).find((item) => item.pattern === 'LOJA PARCELADA');

    expect(found?.recategorizedCount).toBe(3);
  });

  it('is covered only by a rule that is on, of the same category, with a text inside the pattern', async () => {
    movePurchases(['LOJA COBERTA', 'LOJA COBERTA', 'LOJA COBERTA']);
    const rule = {
      id: crypto.randomUUID(),
      descriptionContains: null as string | null,
      counterpartyContains: 'LOJA' as string | null,
      kind: null,
      accountId: null,
      amountMinCents: null,
      amountMaxCents: null,
      categoryId: categoryId(),
      tagIds: [],
      enabled: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    db.rules.push(rule);

    // A rule on the sender alone does not cover the pattern.
    expect((await suggestions()).some((item) => item.pattern === 'LOJA COBERTA')).toBe(true);

    rule.descriptionContains = 'COBERTA';
    expect((await suggestions()).some((item) => item.pattern === 'LOJA COBERTA')).toBe(false);
  });

  it('refuses a pattern with less than 2 characters once normalized, and keeps the rest', async () => {
    const short = await callApi('POST', '/rule-suggestions/accept', {
      pattern: '  x ',
      categoryId: categoryId(),
      applyToHistory: false,
    });
    expect(short.status).toBe(400);
    expect(apiErrorSchema.parse(short.json).code).toBe('VALIDATION_FAILED');
    expect(short.json).toMatchObject({ details: { issues: [{ path: 'pattern' }] } });

    const ok = await callApi('POST', '/rule-suggestions/accept', {
      pattern: 'loja 3/10',
      categoryId: categoryId(),
      applyToHistory: false,
    });
    expect(ok.status).toBe(201);
    expect(db.rules.some((rule) => rule.descriptionContains === 'LOJA')).toBe(true);
  });

  it('refuses `transactionIds` that are not ids', async () => {
    const answer = await callApi('GET', '/rule-suggestions?transactionIds=abc');

    expect(answer.status).toBe(400);
    expect(apiErrorSchema.parse(answer.json).code).toBe('VALIDATION_FAILED');
  });
});
