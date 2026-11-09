import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KyselyUnitOfWork } from '#/database/unit-of-work/kysely-unit-of-work.service.ts';
import { ApplyBankVersionsUseCase } from '#/modules/transactions/application/bank-import/apply-bank-versions.usecase.ts';
import { ApplyDetectedNaturesUseCase } from '#/modules/transactions/application/bank-import/apply-detected-natures.usecase.ts';
import { ApplyImportRulesUseCase } from '#/modules/transactions/application/bank-import/apply-import-rules.usecase.ts';
import { CountBankTransactionsQuery } from '#/modules/transactions/application/bank-import/count-bank-transactions.query.ts';
import { ListBankTransactionsQuery } from '#/modules/transactions/application/bank-import/list-bank-transactions.query.ts';
import { ListDetectionPoolQuery } from '#/modules/transactions/application/bank-import/list-detection-pool.query.ts';
import { MarkRemovedByBankUseCase } from '#/modules/transactions/application/bank-import/mark-removed-by-bank.usecase.ts';
import { InvoiceMonthResolver } from '#/modules/transactions/application/transaction/invoice-month-resolver.service.ts';
import { KyselyTransactionRepository } from '#/modules/transactions/infra/transaction/transaction.repository.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const clock = createFixedClock('2026-11-09T15:00:00.000Z');

describe('the use cases and queries of transactions that the sync calls', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let repository: KyselyTransactionRepository;
  let unitOfWork: KyselyUnitOfWork;
  let checking: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    repository = new KyselyTransactionRepository(database.db);
    unitOfWork = new KyselyUnitOfWork(database.db);
    checking = await insertTestAccount(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  const row = (id: string) =>
    database.db
      .selectFrom('transactions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirstOrThrow();

  describe('ListBankTransactionsQuery', () => {
    it('lists the transactions of the bank of the account from the day on, with the original; a manual one is not', async () => {
      const inside = await insertTestExpense(database.db, checking, {
        cents: 100,
        on: '2026-11-05',
      });
      await insertTestExpense(database.db, checking, { cents: 200, on: '2026-09-01' });
      await insertTestTransaction(database.db, checking, { occurred_on: '2026-11-06' });
      const other = await insertTestAccount(database.db);
      await insertTestExpense(database.db, other, { cents: 300, on: '2026-11-05' });

      const found = await new ListBankTransactionsQuery(database.db).execute({
        accountId: checking,
        fromOn: '2026-10-01',
      });

      expect(found).toEqual([
        {
          transactionId: inside,
          bankDescription: 'Pix enviado',
          bankAmountCents: -100,
          bankOccurredOn: '2026-11-05',
          isRemovedByBank: false,
        },
      ]);
    });

    it('says which ones the bank removed', async () => {
      const id = await insertTestExpense(database.db, checking, {
        cents: 100,
        on: '2026-11-05',
        overrides: { bank_removed_at: '2026-11-08T00:00:00.000Z' },
      });

      const [found] = await new ListBankTransactionsQuery(database.db).execute({
        accountId: checking,
        fromOn: '2026-11-01',
      });

      expect(found).toMatchObject({ transactionId: id, isRemovedByBank: true });
    });
  });

  describe('CountBankTransactionsQuery', () => {
    it('counts the ones that came from the bank in the accounts, not the manual ones', async () => {
      await insertTestExpense(database.db, checking, { cents: 100, on: '2026-11-05' });
      await insertTestIncome(database.db, checking, { cents: 100, on: '2026-11-05' });
      await insertTestTransaction(database.db, checking);
      const query = new CountBankTransactionsQuery(database.db);

      expect(await query.execute([checking])).toBe(2);
      expect(await query.execute([])).toBe(0);
    });
  });

  describe('ListDetectionPoolQuery', () => {
    const pool = (links?: ConstructorParameters<typeof ListDetectionPoolQuery>[1]) =>
      new ListDetectionPoolQuery(database.db, links).execute({
        from: '2026-11-01',
        to: '2026-11-30',
      });

    it('reads the transactions of the bank between the days, what each one is and whether it is a card', async () => {
      const card = await insertTestCreditCard(database.db);
      const debit = await insertTestExpense(database.db, checking, {
        cents: 500,
        on: '2026-11-05',
      });
      const credit = await insertTestIncome(database.db, card, { cents: 500, on: '2026-11-06' });

      const found = await pool();

      expect(
        found
          .map((item) => [
            item.transactionId,
            item.isCard,
            item.amountCents,
            item.nature,
            item.natureSetBy,
          ])
          .toSorted(),
      ).toEqual(
        [
          [debit, false, -500, 'expense', 'system'],
          [credit, true, 500, 'income', 'system'],
        ].toSorted(),
      );
    });

    it('leaves out the manual ones, the ones out of the days, the ignored ones and the removed ones the bank sent', async () => {
      await insertTestTransaction(database.db, checking);
      await insertTestExpense(database.db, checking, { cents: 1, on: '2026-10-31' });
      await insertTestExpense(database.db, checking, {
        cents: 2,
        on: '2026-11-05',
        overrides: { ignored_at: '2026-11-06T00:00:00.000Z' },
      });
      await insertTestExpense(database.db, checking, {
        cents: 3,
        on: '2026-11-05',
        overrides: { bank_removed_at: '2026-11-06T00:00:00.000Z' },
      });
      const kept = await insertTestExpense(database.db, checking, { cents: 4, on: '2026-11-05' });

      expect((await pool()).map((item) => item.transactionId)).toEqual([kept]);
    });

    it('marks what is split, categorized by Lucas, and what already pays something (from the links reader)', async () => {
      const linked = await insertTestExpense(database.db, checking, { cents: 1, on: '2026-11-05' });
      const plain = await insertTestExpense(database.db, checking, { cents: 2, on: '2026-11-05' });
      const split = await insertTestExpense(database.db, checking, { cents: 4, on: '2026-11-05' });
      await database.db
        .insertInto('transaction_splits')
        .values([
          {
            id: 's1',
            transaction_id: split,
            position: 0,
            amount_cents: -1,
            nature: 'expense',
            category_id: null,
            description: null,
          },
          {
            id: 's2',
            transaction_id: split,
            position: 1,
            amount_cents: -3,
            nature: 'expense',
            category_id: null,
            description: null,
          },
        ])
        .execute();
      const links = {
        async linksOf(ids: string[]) {
          return new Map(
            ids
              .filter((id) => id === linked)
              .map((id) => [
                id,
                {
                  occurrence: {
                    occurrenceId: 'o',
                    recurrenceName: 'r',
                    month: '2026-11',
                    expectedOn: null,
                    amountCents: 1,
                  },
                  bill: null,
                  invoicePayment: null,
                },
              ]),
          ) as never;
        },
      };

      const found = new Map((await pool(links)).map((item) => [item.transactionId, item]));

      expect(found.get(linked)?.isLinked).toBe(true);
      expect(found.get(plain)).toMatchObject({
        isLinked: false,
        isSplit: false,
        hasUserCategory: false,
      });
      expect(found.get(split)?.isSplit).toBe(true);
    });
  });

  describe('ApplyBankVersionsUseCase', () => {
    const build = () =>
      new ApplyBankVersionsUseCase(
        repository,
        { requireAccount: async (id) => ({ id, isCard: false, isArchived: false }) },
        new InvoiceMonthResolver(undefined),
        clock,
      );

    it('does not write nor count what the bank did not change', async () => {
      const id = await insertTestExpense(database.db, checking, { cents: 100, on: '2026-11-05' });
      const before = await row(id);

      const answer = await unitOfWork.run((executor) =>
        build().execute(
          {
            updates: [
              {
                transactionId: id,
                description: 'Pix enviado',
                amountCents: -100,
                occurredOn: '2026-11-05',
                counterparty: null,
                status: 'posted',
              },
            ],
          },
          executor,
        ),
      );

      expect(answer).toEqual({ updatedCount: 0 });
      expect(await row(id)).toEqual(before);
    });

    it('counts a change in the status of the bank, and keeps the transaction as it is otherwise', async () => {
      const id = await insertTestExpense(database.db, checking, {
        cents: 100,
        on: '2026-11-05',
        overrides: { bank_status: 'pending' },
      });

      const answer = await unitOfWork.run((executor) =>
        build().execute(
          {
            updates: [
              {
                transactionId: id,
                description: 'Pix enviado',
                amountCents: -100,
                occurredOn: '2026-11-05',
                counterparty: null,
                status: 'posted',
              },
            ],
          },
          executor,
        ),
      );

      expect(answer.updatedCount).toBe(1);
      expect(await row(id)).toMatchObject({ bank_status: 'posted', description: 'Pix enviado' });
    });

    it('ignores a transaction that does not exist or is not from the bank', async () => {
      const manual = await insertTestTransaction(database.db, checking);

      const answer = await unitOfWork.run((executor) =>
        build().execute(
          {
            updates: [
              {
                transactionId: manual,
                description: 'x',
                amountCents: -1,
                occurredOn: '2026-11-05',
                counterparty: null,
                status: 'posted',
              },
              {
                transactionId: 'missing',
                description: 'x',
                amountCents: -1,
                occurredOn: '2026-11-05',
                counterparty: null,
                status: 'posted',
              },
            ],
          },
          executor,
        ),
      );

      expect(answer.updatedCount).toBe(0);
      expect((await row(manual)).description).toBe('Padaria');
    });
  });

  describe('MarkRemovedByBankUseCase', () => {
    it('marks the ones of the bank, once, and counts only what it marked now', async () => {
      const id = await insertTestExpense(database.db, checking, { cents: 100, on: '2026-11-05' });
      const manual = await insertTestTransaction(database.db, checking);
      const useCase = new MarkRemovedByBankUseCase(repository, clock);

      const first = await unitOfWork.run((executor) =>
        useCase.execute({ transactionIds: [id, manual] }, executor),
      );
      const second = await unitOfWork.run((executor) =>
        useCase.execute({ transactionIds: [id] }, executor),
      );

      expect(first.removedCount).toBe(1);
      expect(second.removedCount).toBe(0);
      expect((await row(id)).bank_removed_at).toBe('2026-11-09T15:00:00.000Z');
      expect((await row(manual)).bank_removed_at).toBeNull();
    });
  });

  describe('ApplyDetectedNaturesUseCase', () => {
    const build = () => new ApplyDetectedNaturesUseCase(repository, clock);

    it('marks payments and a pair of transfer legs, linking them; answers what changed', async () => {
      const payment = await insertTestExpense(database.db, checking, {
        cents: 100,
        on: '2026-11-05',
      });
      const savings = await insertTestAccount(database.db);
      const out = await insertTestExpense(database.db, checking, { cents: 500, on: '2026-11-05' });
      const into = await insertTestIncome(database.db, savings, { cents: 500, on: '2026-11-05' });

      const answer = await unitOfWork.run((executor) =>
        build().execute(
          { payments: [payment], transfers: [{ firstId: out, secondId: into }] },
          executor,
        ),
      );

      expect(answer.payments).toEqual([payment]);
      expect(answer.transfers.toSorted()).toEqual([out, into].toSorted());
      expect(await row(payment)).toMatchObject({
        nature: 'invoice_payment',
        nature_set_by: 'system',
      });
      expect(await row(out)).toMatchObject({ nature: 'transfer', transfer_counterpart_id: into });
      expect(await row(into)).toMatchObject({ nature: 'transfer', transfer_counterpart_id: out });
    });

    it('a pair changes whole or not at all: one leg Lucas chose keeps the other as it was', async () => {
      const savings = await insertTestAccount(database.db);
      const out = await insertTestExpense(database.db, checking, {
        cents: 500,
        on: '2026-11-05',
        overrides: { nature_set_by: 'user' },
      });
      const into = await insertTestIncome(database.db, savings, { cents: 500, on: '2026-11-05' });

      const answer = await unitOfWork.run((executor) =>
        build().execute({ payments: [], transfers: [{ firstId: out, secondId: into }] }, executor),
      );

      expect(answer.transfers).toEqual([]);
      expect((await row(into)).nature).toBe('income');
      expect((await row(out)).nature).toBe('expense');
    });

    it('never takes the nature of what Lucas chose as a payment', async () => {
      const chosen = await insertTestExpense(database.db, checking, {
        cents: 100,
        on: '2026-11-05',
        overrides: { nature_set_by: 'user' },
      });

      const answer = await unitOfWork.run((executor) =>
        build().execute({ payments: [chosen], transfers: [] }, executor),
      );

      expect(answer.payments).toEqual([]);
      expect((await row(chosen)).nature).toBe('expense');
    });
  });

  describe('ApplyImportRulesUseCase', () => {
    it('gives the category and the tags the rules resolved, and refuses where the transaction does not take it', async () => {
      const category = (
        await database.db
          .selectFrom('categories')
          .select('id')
          .where('kind', '=', 'expense')
          .orderBy('name')
          .executeTakeFirstOrThrow()
      ).id;
      const income = (
        await database.db
          .selectFrom('categories')
          .select('id')
          .where('kind', '=', 'income')
          .orderBy('name')
          .executeTakeFirstOrThrow()
      ).id;
      await database.db
        .insertInto('category_rules')
        .values({
          id: 'rule-1',
          description_contains: 'PIX',
          counterparty_contains: null,
          kind: null,
          account_id: null,
          amount_min_cents: null,
          amount_max_cents: null,
          category_id: category,
          enabled: 1,
          created_at: '2026-11-01T00:00:00.000Z',
          updated_at: '2026-11-01T00:00:00.000Z',
        })
        .execute();
      const expense = await insertTestExpense(database.db, checking, {
        cents: 100,
        on: '2026-11-05',
      });
      const withoutRule = await insertTestExpense(database.db, checking, {
        cents: 100,
        on: '2026-11-05',
      });
      const byLucas = await insertTestExpense(database.db, checking, {
        cents: 100,
        on: '2026-11-05',
        overrides: { category_id: category, category_source: 'user' },
      });
      const useCase = new ApplyImportRulesUseCase(repository, clock);

      const answer = await unitOfWork.run((executor) =>
        useCase.execute(
          {
            items: [
              {
                transactionId: expense,
                ruleId: 'rule-1',
                category: { id: category, kind: 'expense', isArchived: false },
                tagIds: [],
              },
              {
                transactionId: withoutRule,
                ruleId: null,
                category: { id: category, kind: 'expense', isArchived: false },
                tagIds: [],
              },
              {
                transactionId: byLucas,
                ruleId: 'rule-1',
                category: { id: income, kind: 'income', isArchived: false },
                tagIds: [],
              },
              { transactionId: 'missing', ruleId: null, category: null, tagIds: [] },
            ],
          },
          executor,
        ),
      );

      expect(answer.changedCount).toBe(1);
      expect(await row(expense)).toMatchObject({
        category_id: category,
        category_source: 'rule',
        category_rule_id: 'rule-1',
      });
      expect((await row(withoutRule)).category_id).toBeNull();
      expect(await row(byLucas)).toMatchObject({ category_id: category, category_source: 'user' });
    });
  });

  it('the resolver of the invoice month asks the owner of the cycle (a closing on the 5th: the 6th goes to the next invoice)', async () => {
    const card = await insertTestCreditCard(database.db);
    const resolver = new InvoiceMonthResolver({
      monthFor: async () =>
        (await import('#/shared/date/month.value-object.ts')).Month.of('2026-12'),
    });

    const month = await resolver.resolve(
      { id: card, isCard: true, isArchived: false },
      BusinessDate.of('2026-11-06'),
      database.db,
    );

    expect(month?.value).toBe('2026-12');
  });
});
