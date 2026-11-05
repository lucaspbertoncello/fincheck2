import { accountDtoSchema } from '@fincheck/shared/accounts/account/account.schema.ts';
import { categoryDtoSchema } from '@fincheck/shared/categories/category/category.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { reviewQueueDtoSchema } from '@fincheck/shared/transactions/review-queue/review-queue.schema.ts';
import { installmentPlanDtoSchema } from '@fincheck/shared/transactions/installment-plan/installment-plan.schema.ts';
import {
  bulkTransactionsResultSchema,
  restoreBulkResultSchema,
} from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.schema.ts';
import { transactionSummaryDtoSchema } from '@fincheck/shared/transactions/transaction-summary/transaction-summary.schema.ts';
import {
  listTransactionsResponseSchema,
  transactionDtoSchema,
} from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import { describe, expect, it } from 'vitest';

import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function month(): Promise<Transaction.Dto[]> {
  return listTransactionsResponseSchema.parse(
    (await callApi('GET', `/transactions?month=${CURRENT_MONTH}`)).json,
  ).items;
}

async function reviewQueue() {
  return reviewQueueDtoSchema.parse((await callApi('GET', '/transactions/review-queue')).json);
}

describe('transactions routes (reads)', () => {
  it('lists a month with the real cases: installment, split, ignored, bank change, transfer', async () => {
    const items = await month();
    expect(
      items.some((tx) => tx.installment !== null && tx.competenceOn.startsWith(CURRENT_MONTH)),
    ).toBe(true);
    expect(items.some((tx) => tx.splits.length === 2)).toBe(true);
    expect(items.some((tx) => tx.ignoredAt !== null)).toBe(true);
    expect(items.some((tx) => tx.bankChange !== null && tx.isEdited)).toBe(true);
    expect(items.filter((tx) => tx.nature === 'transfer')).toHaveLength(2);
    expect(items.some((tx) => tx.links.occurrence !== null)).toBe(true);
    const sorted = [...items].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));
    expect(items.map((tx) => tx.occurredOn)).toEqual(sorted.map((tx) => tx.occurredOn));
  });

  it('paginates without a month and filters', async () => {
    const first = listTransactionsResponseSchema.parse(
      (await callApi('GET', '/transactions?limit=5')).json,
    );
    expect(first.items).toHaveLength(5);
    expect(first.nextCursor).not.toBeNull();
    const second = listTransactionsResponseSchema.parse(
      (await callApi('GET', `/transactions?limit=5&cursor=${first.nextCursor}`)).json,
    );
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id);

    const uncategorized = listTransactionsResponseSchema.parse(
      (await callApi('GET', '/transactions?uncategorized=true')).json,
    );
    expect(uncategorized.items.length).toBe((await reviewQueue()).total);
    expect((await callApi('GET', `/transactions?month=${CURRENT_MONTH}&limit=5`)).status).toBe(400);
  });

  describe('a free period (from and to), page by page', () => {
    const FROM = '2026-09-01';
    const TO = '2026-10-31';

    async function pageOf(query: string) {
      return listTransactionsResponseSchema.parse(
        (await callApi('GET', `/transactions?${query}`)).json,
      );
    }

    async function everything(query: string, limit = 25): Promise<Transaction.Dto[]> {
      const items: Transaction.Dto[] = [];
      let cursor: string | null = null;
      do {
        const page: Awaited<ReturnType<typeof pageOf>> = await pageOf(
          `${query}&limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`,
        );
        items.push(...page.items);
        cursor = page.nextCursor;
      } while (cursor);

      return items;
    }

    it('keeps only the transactions whose competence day is in the range, both ends included', async () => {
      const items = await everything(`from=${FROM}&to=${TO}`);

      expect(items.length).toBeGreaterThan(50);
      expect(items.every((tx) => tx.competenceOn >= FROM && tx.competenceOn <= TO)).toBe(true);
      expect(items.some((tx) => tx.competenceOn.startsWith('2026-09'))).toBe(true);
      expect(items.some((tx) => tx.competenceOn.startsWith('2026-10'))).toBe(true);
    });

    it('is the two months put together: the same rows as reading each month', async () => {
      const september = await pageOf('month=2026-09');
      const october = await pageOf('month=2026-10');
      const period = await everything(`from=${FROM}&to=${TO}`);

      expect(new Set(period.map((tx) => tx.id))).toEqual(
        new Set([...september.items, ...october.items].map((tx) => tx.id)),
      );
    });

    it('pages with the cursor without repeating or losing a row, and ends with a null cursor', async () => {
      const first = await pageOf(`from=${FROM}&to=${TO}&limit=20`);
      expect(first.items).toHaveLength(20);
      expect(first.nextCursor).not.toBeNull();

      const all = await everything(`from=${FROM}&to=${TO}`, 20);
      const ids = all.map((tx) => tx.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.slice(0, 20)).toEqual(first.items.map((tx) => tx.id));
      // Contract: competence first (newest), then the day it happened (newest).
      const keys = all.map((tx) => `${tx.competenceOn}|${tx.occurredOn}`);
      expect(keys).toEqual([...keys].sort((a, b) => b.localeCompare(a)));
    });

    it('takes one end alone, and no range at all is the whole history', async () => {
      const upTo = await everything(`to=${FROM}`);
      const from = await everything(`from=${FROM}`);
      const history = await everything('');

      expect(upTo.every((tx) => tx.competenceOn <= FROM)).toBe(true);
      expect(from.every((tx) => tx.competenceOn >= FROM)).toBe(true);
      expect(history.length).toBeGreaterThan(upTo.length);
      expect(history.length).toBeGreaterThan(from.length);
    });

    it('combines with the filters of the list', async () => {
      const out = await everything(`from=${FROM}&to=${TO}&direction=out`);

      expect(out.length).toBeGreaterThan(10);
      expect(out.every((tx) => tx.amountCents < 0)).toBe(true);
    });

    it('refuses a period next to a month, and from after to', async () => {
      expect(
        (await callApi('GET', `/transactions?month=${CURRENT_MONTH}&from=${FROM}`)).status,
      ).toBe(400);
      expect((await callApi('GET', `/transactions?from=${TO}&to=${FROM}`)).status).toBe(400);
    });
  });

  it('summarizes the month, with the review line matching the queue', async () => {
    const summary = transactionSummaryDtoSchema.parse(
      (await callApi('GET', `/transactions/summary?month=${CURRENT_MONTH}`)).json,
    );
    expect(summary.expensesCents).toBeGreaterThan(0);
    expect(summary.incomesCents).toBeGreaterThan(0);
    expect(summary.reviewCount).toBeGreaterThan(0);
    expect(summary.reviewCount).toBeLessThanOrEqual((await reviewQueue()).total);
  });

  it('serves the review queue with suggestions for the Uber without category', async () => {
    const queue = await reviewQueue();
    expect(queue.total).toBeGreaterThanOrEqual(4);
    const uber = queue.items.find((item) => item.transaction.description === 'UBER *TRIP');
    expect(uber?.categorySuggestions[0]?.reason).toBe('history');
    expect(uber?.transaction.categorySuggestion).toBe(uber?.categorySuggestions[0]?.categoryId);
    expect(queue.items.every((item) => item.transaction.isInReview)).toBe(true);
    expect(
      transactionDtoSchema.parse(
        (await callApi('GET', `/transactions/${uber?.transaction.id}`)).json,
      ).id,
    ).toBe(uber?.transaction.id);
  });

  it('lists the installment plans with the next installment', async () => {
    const plans = listResponseSchema(installmentPlanDtoSchema).parse(
      (await callApi('GET', '/installment-plans')).json,
    ).items;
    const notebook = plans.find((plan) => plan.description === 'Notebook Aero 14');
    expect(notebook?.installments).toHaveLength(10);
    expect(notebook?.nextInstallment?.number).toBe(3);
    expect(notebook?.remainingCents).toBe(8 * 34_900);
    expect((await callApi('GET', '/installment-plans?active=false')).status).toBe(200);
  });
});

describe('transactions routes (changes)', () => {
  it('creates a manual expense that shows up in the month and in the summary', async () => {
    const accounts = listResponseSchema(accountDtoSchema).parse(
      (await callApi('GET', '/accounts')).json,
    ).items;
    const before = transactionSummaryDtoSchema.parse(
      (await callApi('GET', `/transactions/summary?month=${CURRENT_MONTH}`)).json,
    );
    const created = await callApi('POST', '/transactions', {
      type: 'expense',
      accountId: accounts[0]?.id,
      method: 'pix',
      description: 'Padaria nova',
      amountCents: 2500,
      occurredOn: TODAY,
    });
    expect(created.status).toBe(201);
    const tx = transactionDtoSchema.parse(created.json);
    expect(tx).toMatchObject({ origin: 'manual', amountCents: -2500, isInReview: true });
    expect((await month()).some((item) => item.id === tx.id)).toBe(true);
    const after = transactionSummaryDtoSchema.parse(
      (await callApi('GET', `/transactions/summary?month=${CURRENT_MONTH}`)).json,
    );
    expect(after.expensesCents).toBe(before.expensesCents + 2500);
    expect(after.reviewCount).toBe(before.reviewCount + 1);
  });

  it('recategorizes one transaction and takes it out of the review queue', async () => {
    const uber = (await reviewQueue()).items.find(
      (item) => item.transaction.description === 'UBER *TRIP',
    );
    const category = uber?.categorySuggestions[0]?.categoryId;
    const patched = await callApi('PATCH', `/transactions/${uber?.transaction.id}`, {
      categoryId: category,
    });
    expect(transactionDtoSchema.parse(patched.json)).toMatchObject({
      categoryId: category,
      categorySource: 'user',
      isInReview: false,
    });
    expect(
      (await reviewQueue()).items.some((item) => item.transaction.id === uber?.transaction.id),
    ).toBe(false);
    expect(
      (await callApi('PATCH', `/transactions/${uber?.transaction.id}`, { accountId: 'x' })).status,
    ).toBe(400);
  });

  it('recategorizes in bulk and undoes with the previous state', async () => {
    const queue = await reviewQueue();
    const categories = listResponseSchema(categoryDtoSchema).parse(
      (await callApi('GET', '/categories')).json,
    ).items;
    const target = categories.find((category) => category.kind === 'expense')?.id;
    const ids = queue.items
      .filter((item) => item.transaction.nature === 'expense')
      .slice(0, 2)
      .map((item) => item.transaction.id);

    const done = bulkTransactionsResultSchema.parse(
      (
        await callApi('POST', '/transactions/bulk', {
          transactionIds: ids,
          action: { type: 'categorize', categoryId: target },
        })
      ).json,
    );
    expect(done.updatedCount + done.skipped.length).toBe(2);
    expect((await reviewQueue()).total).toBeLessThan(queue.total);

    const restored = restoreBulkResultSchema.parse(
      (await callApi('POST', '/transactions/bulk/restore', { items: done.previous })).json,
    );
    expect(restored.restoredCount).toBe(done.updatedCount);
    expect((await reviewQueue()).total).toBe(queue.total);
  });

  it('ignores and restores a transaction, then splits and unsplits one', async () => {
    const [target] = (await month()).filter(
      (tx) =>
        tx.nature === 'expense' &&
        tx.splits.length === 0 &&
        tx.ignoredAt === null &&
        tx.origin === 'bank' &&
        tx.installment === null,
    );
    const ignored = transactionDtoSchema.parse(
      (await callApi('POST', `/transactions/${target?.id}/ignore`)).json,
    );
    expect(ignored.ignoredAt).not.toBeNull();
    expect((await callApi('POST', `/transactions/${target?.id}/ignore`)).status).toBe(409);
    expect(
      transactionDtoSchema.parse(
        (await callApi('POST', `/transactions/${target?.id}/unignore`)).json,
      ).ignoredAt,
    ).toBeNull();

    const amount = Math.abs(target?.amountCents ?? 0);
    const split = transactionDtoSchema.parse(
      (
        await callApi('PUT', `/transactions/${target?.id}/splits`, {
          parts: [{ amountCents: 1 }, { amountCents: amount - 1 }],
        })
      ).json,
    );
    expect(split.splits).toHaveLength(2);
    expect(
      (
        await callApi('PUT', `/transactions/${target?.id}/splits`, {
          parts: [{ amountCents: 1 }, { amountCents: 1 }],
        })
      ).status,
    ).toBe(422);
    expect(
      transactionDtoSchema.parse(
        (await callApi('DELETE', `/transactions/${target?.id}/splits`)).json,
      ).splits,
    ).toEqual([]);
  });

  it('resolves a bank change and restores the original', async () => {
    const changed = (await month()).find((tx) => tx.bankChange !== null);
    const resolved = transactionDtoSchema.parse(
      (await callApi('POST', `/transactions/${changed?.id}/bank-change/resolve`, { use: 'bank' }))
        .json,
    );
    expect(resolved.bankChange).toBeNull();
    expect(resolved.amountCents).toBe(resolved.bank?.amountCents);
    expect(
      (await callApi('POST', `/transactions/${changed?.id}/bank-change/resolve`, { use: 'mine' }))
        .status,
    ).toBe(422);
    expect(
      transactionDtoSchema.parse(
        (await callApi('POST', `/transactions/${changed?.id}/restore-original`)).json,
      ).isEdited,
    ).toBe(false);
  });

  it('deletes only a manual transaction', async () => {
    const bank = (await month()).find((tx) => tx.origin === 'bank');
    expect((await callApi('DELETE', `/transactions/${bank?.id}`)).status).toBe(422);
    const manual = (await month()).find((tx) => tx.origin === 'manual' && tx.installment === null);
    expect((await callApi('DELETE', `/transactions/${manual?.id}`)).status).toBe(204);
  });

  it('creates and deletes an installment plan with the leftover cent on the first installment', async () => {
    const cards = (await callApi('GET', '/accounts')).json as {
      items: { id: string; type: string }[];
    };
    const card = cards.items.find((account) => account.type === 'credit_card');
    const created = await callApi('POST', '/installment-plans', {
      accountId: card?.id,
      description: 'Cadeira',
      totalCents: 129_900,
      installmentCount: 12,
      firstInvoiceMonth: CURRENT_MONTH,
      purchaseOn: TODAY,
    });
    expect(created.status).toBe(201);
    const plan = installmentPlanDtoSchema.parse(created.json);
    expect(plan.installments.every((item) => item.amountCents === 10_825)).toBe(true);
    expect((await callApi('DELETE', `/installment-plans/${plan.id}`)).status).toBe(204);
    expect((await callApi('DELETE', `/installment-plans/${plan.id}`)).status).toBe(404);
  });
});
