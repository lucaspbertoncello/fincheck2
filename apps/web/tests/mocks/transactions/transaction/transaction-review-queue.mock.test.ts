import { reviewQueueDtoSchema } from '@fincheck/shared/transactions/review-queue/review-queue.schema.ts';
import { describe, expect, it } from 'vitest';

import { presentOccurrence } from '#mocks/recurrences/occurrence/present-occurrence.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

function bankAccountId(): string {
  return db.accounts.find((account) => account.type === 'checking')?.id ?? '';
}

function addToReview(
  description: string,
  amountCents = -1000,
  extra: Partial<MockState.TransactionRecord> = {},
): MockState.TransactionRecord {
  const record = makeTransactionRecord({
    accountId: bankAccountId(),
    method: 'pix',
    description,
    amountCents,
    occurredOn: TODAY,
  });
  Object.assign(record, extra);
  db.transactions.push(record);

  return record;
}

async function itemOf(record: MockState.TransactionRecord) {
  const queue = reviewQueueDtoSchema.parse(
    (await callApi('GET', '/transactions/review-queue?limit=200')).json,
  );
  const item = queue.items.find((entry) => entry.transaction.id === record.id);
  if (!item) throw new Error('transaction not in the queue');

  return item;
}

function categoryOf(kind: 'expense' | 'income', index = 0): string {
  return db.categories.filter((item) => item.kind === kind && !item.archivedAt)[index]?.id ?? '';
}

function addRule(rule: Partial<MockState.RuleRecord>): void {
  db.rules.push({
    id: crypto.randomUUID(),
    descriptionContains: null,
    counterpartyContains: null,
    kind: null,
    accountId: null,
    amountMinCents: null,
    amountMaxCents: null,
    categoryId: null,
    tagIds: [],
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...rule,
  });
}

describe('review queue: rulePattern (mock vs api 15)', () => {
  it('drops the "n/N" of an installment', async () => {
    const record = addToReview('LOJA XPTO 3/10');

    expect((await itemOf(record)).rulePattern).toBe('LOJA XPTO');
  });
});

describe('review queue: category suggestions (mock vs api 25, 32, 33)', () => {
  it('suggests from what Lucas chose by hand for the same description, without the "n/N"', async () => {
    const chosen = categoryOf('expense', 1);
    addToReview('LOJA XPTO 1/3', -1000, { categoryId: chosen, categorySource: 'user' });
    const record = addToReview('LOJA XPTO 2/3');

    expect((await itemOf(record)).categorySuggestions).toEqual([
      { categoryId: chosen, reason: 'history' },
    ]);
  });

  it('ignores a category a rule or a recurrence put, and an ignored transaction', async () => {
    addToReview('LOJA XPTO', -1000, {
      categoryId: categoryOf('expense', 1),
      categorySource: 'rule',
    });
    addToReview('LOJA XPTO', -1000, {
      categoryId: categoryOf('expense', 2),
      categorySource: 'recurrence',
    });
    addToReview('LOJA XPTO', -1000, {
      categoryId: categoryOf('expense', 3),
      categorySource: 'user',
      ignoredAt: '2026-01-01T00:00:00.000Z',
    });
    const record = addToReview('LOJA XPTO');

    expect((await itemOf(record)).categorySuggestions).toEqual([]);
  });

  it('suggests only the rules that are on and have a text condition, without sender or account', async () => {
    const [text, sender, account, off] = [1, 2, 3, 4].map((index) => categoryOf('expense', index));
    addRule({ descriptionContains: 'LOJA XPTO', categoryId: text ?? null });
    addRule({
      descriptionContains: 'LOJA XPTO',
      counterpartyContains: 'XPTO',
      categoryId: sender ?? null,
    });
    addRule({
      descriptionContains: 'LOJA XPTO',
      accountId: bankAccountId(),
      categoryId: account ?? null,
    });
    addRule({ descriptionContains: 'LOJA XPTO', categoryId: off ?? null, enabled: false });
    addRule({ counterpartyContains: 'XPTO', categoryId: categoryOf('expense', 5) });
    const record = addToReview('LOJA XPTO 1/2');

    expect((await itemOf(record)).categorySuggestions).toEqual([
      { categoryId: text, reason: 'rule' },
    ]);
  });
});

describe('review queue: recurrence candidates (mock vs api 65)', () => {
  async function openOccurrence() {
    // Reading the queue creates the occurrences of the recurrences.
    await callApi('GET', '/transactions/review-queue');
    for (const record of db.occurrences) {
      const recurrence = db.recurrences.find((item) => item.id === record.recurrenceId);
      const dto = presentOccurrence(db, record);
      if (
        recurrence?.matchText &&
        !recurrence.pausedAt &&
        !recurrence.archivedAt &&
        dto.payments.length === 0 &&
        ['expected', 'late'].includes(dto.status)
      ) {
        return { recurrence, record, dto };
      }
    }
    throw new Error('seed without an open occurrence with a sender');
  }

  it('offers the single occurrence that fits the sender, the day and the value', async () => {
    const { recurrence, dto } = await openOccurrence();
    const income = recurrence.kind === 'income';
    const record = addToReview(
      `${recurrence.matchText} PAGAMENTO`,
      income ? dto.expectedAmountCents : -dto.expectedAmountCents,
      { occurredOn: dto.windowStartOn },
    );

    const item = await itemOf(record);

    expect(item.recurrenceCandidates.map((candidate) => candidate.occurrenceId)).toContain(dto.id);
  });

  it('offers nothing to a transaction that already pays an occurrence', async () => {
    const { recurrence, record: occurrence, dto } = await openOccurrence();
    const income = recurrence.kind === 'income';
    const record = addToReview(
      `${recurrence.matchText} PAGAMENTO`,
      income ? dto.expectedAmountCents : -dto.expectedAmountCents,
      { occurredOn: dto.windowStartOn },
    );
    const other = db.occurrences.find((item) => item.id !== occurrence.id);
    other?.payments.push({
      id: crypto.randomUUID(),
      transactionId: record.id,
      amountCents: 100,
      occurredOn: dto.windowStartOn,
      linkedBy: 'user',
    } as never);

    expect((await itemOf(record)).recurrenceCandidates).toEqual([]);
  });

  it('offers nothing of a paused recurrence or outside the window', async () => {
    const { recurrence, dto } = await openOccurrence();
    const income = recurrence.kind === 'income';
    const amount = income ? dto.expectedAmountCents : -dto.expectedAmountCents;
    const early = addToReview(`${recurrence.matchText} PAGAMENTO`, amount, {
      occurredOn: '2020-01-01',
    });
    expect((await itemOf(early)).recurrenceCandidates).toEqual([]);

    const record = addToReview(`${recurrence.matchText} PAGAMENTO`, amount, {
      occurredOn: dto.windowStartOn,
    });
    recurrence.pausedAt = '2026-01-01T00:00:00.000Z';
    expect((await itemOf(record)).recurrenceCandidates).toEqual([]);
  });
});
