import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { KyselyUnitOfWork } from '#/database/unit-of-work/kysely-unit-of-work.service.ts';
import { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import { TransactionSplit } from '#/modules/transactions/domain/transaction/transaction-split.value-object.ts';
import { KyselyInstallmentPlanRepository } from '#/modules/transactions/infra/installment-plan/installment-plan.repository.ts';
import { KyselyTransactionRepository } from '#/modules/transactions/infra/transaction/transaction.repository.ts';
import { InstallmentPlan } from '#/modules/transactions/domain/installment-plan/installment-plan.entity.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { insertTestTag } from '#tests/support/categories/tag/insert-test-tag.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { buildTestTransaction } from '#tests/support/transactions/transaction/build-test-transaction.util.ts';
import { buildTestBankTransaction } from '#tests/support/transactions/transaction/build-test-bank-transaction.util.ts';

const LATER = '2026-11-07T09:00:00.000Z';

describe('KyselyTransactionRepository', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let repository: KyselyTransactionRepository;
  let accountId: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    repository = new KyselyTransactionRepository(database.db);
    accountId = await insertTestAccount(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  it('round-trips a manual transaction', async () => {
    const transaction = buildTestTransaction({ accountId, description: 'Café' });

    await repository.save(transaction);
    const found = await repository.findById(transaction.id);

    expect(found).toEqual(transaction);
    expect(found?.amount.cents).toBe(-1250);
    expect(await repository.findById('nope')).toBeNull();
  });

  it('round-trips everything a bank transaction keeps: original, pending change, edit, splits, tags', async () => {
    const category = await insertTestCategory(database.db);
    const tagA = await insertTestTag(database.db);
    const tagB = await insertTestTag(database.db);
    const transaction = buildTestBankTransaction({
      accountId,
      description: 'Café',
      amount: Money.fromCents(-1800),
      editNote: 'conferido',
      categoryId: category,
      categorySource: 'user',
      bank: {
        description: 'PADARIA SANTA CLARA',
        amount: Money.fromCents(-1300),
        occurredOn: BusinessDate.of('2026-11-04'),
        counterparty: 'Padaria Ltda',
        status: 'pending',
      },
      bankChange: {
        detectedAt: LATER,
        changes: [
          { field: 'amountCents', before: -1250, after: -1300 },
          { field: 'occurredOn', before: '2026-11-05', after: '2026-11-04' },
          { field: 'description', before: 'PADARIA', after: 'PADARIA SANTA CLARA' },
        ],
      },
      removedByBankAt: LATER,
      tagIds: [tagA, tagB],
    });

    await repository.save(transaction);
    const found = await repository.findById(transaction.id);

    expect(found?.bank).toEqual(transaction.bank);
    expect(found?.bankChange).toEqual(transaction.bankChange);
    expect(found?.removedByBankAt).toBe(LATER);
    expect(found?.editNote).toBe('conferido');
    expect([...(found?.tagIds ?? [])].sort()).toEqual([tagA, tagB].sort());
    expect(found?.isEdited()).toBe(true);
  });

  it('round-trips the parts of a split transaction in order', async () => {
    const category = await insertTestCategory(database.db);
    const transaction = buildTestTransaction({ accountId });
    transaction.splitInto(
      [
        {
          amount: Money.fromCents(1000),
          category: { id: category, kind: 'expense', isArchived: false },
          description: null,
        },
        { amount: Money.fromCents(250), category: null, description: 'Metade da Júlia' },
      ],
      LATER,
    );

    await repository.save(transaction);
    const found = await repository.findById(transaction.id);

    expect(found?.splits).toEqual(transaction.splits);
    expect(found?.splits.map((part) => part.amount.cents)).toEqual([-1000, -250]);
  });

  it('updates: a second save rewrites the fields, the parts and the tags', async () => {
    const tag = await insertTestTag(database.db);
    const transaction = buildTestTransaction({ accountId, tagIds: [tag] });
    transaction.splitInto(
      [
        { amount: Money.fromCents(1000), category: null, description: null },
        { amount: Money.fromCents(250), category: null, description: null },
      ],
      LATER,
    );
    await repository.save(transaction);

    transaction.unsplit(LATER);
    transaction.replaceTags([], LATER);
    transaction.edit({ description: 'Outra', amount: Money.fromCents(2000) }, LATER);
    transaction.ignore(LATER);
    await repository.save(transaction);
    const found = await repository.findById(transaction.id);

    expect(found).toEqual(transaction);
    expect(found?.splits).toEqual([]);
    expect(found?.tagIds).toEqual([]);
    expect(await database.db.selectFrom('transaction_splits').select('id').execute()).toEqual([]);
    expect(
      (
        await database.db
          .selectFrom('transactions')
          .select('search_text')
          .where('id', '=', transaction.id)
          .executeTakeFirstOrThrow()
      ).search_text,
    ).toBe('OUTRA');
  });

  it('finds several by id, none for an empty list', async () => {
    const first = buildTestTransaction({ accountId });
    const second = buildTestTransaction({ accountId });
    await repository.save(first);
    await repository.save(second);

    const found = await repository.findByIds([first.id, second.id, 'nope']);

    expect(found.map((transaction) => transaction.id).sort()).toEqual([first.id, second.id].sort());
    expect(await repository.findByIds([])).toEqual([]);
  });

  it('deletes with the parts and the tags', async () => {
    const tag = await insertTestTag(database.db);
    const transaction = buildTestTransaction({ accountId, tagIds: [tag] });
    transaction.splitInto(
      [
        { amount: Money.fromCents(1000), category: null, description: null },
        { amount: Money.fromCents(250), category: null, description: null },
      ],
      LATER,
    );
    await repository.save(transaction);

    await repository.delete(transaction.id);

    expect(await repository.findById(transaction.id)).toBeNull();
    expect(await database.db.selectFrom('transaction_splits').select('id').execute()).toEqual([]);
    expect(await database.db.selectFrom('transaction_tags').select('tag_id').execute()).toEqual([]);
  });

  it('finds the parcels of a plan, and deleting the plan takes them', async () => {
    const card = await insertTestCreditCard(database.db);
    const plans = new KyselyInstallmentPlanRepository(database.db);
    const plan = InstallmentPlan.createManual(
      {
        account: { id: card, isCard: true, isArchived: false },
        description: 'Cadeira',
        total: Money.fromCents(30000),
        installmentCount: 3,
        firstInvoiceMonth: Month.of('2026-11'),
        purchaseOn: BusinessDate.of('2026-10-31'),
        category: null,
        tags: [],
      },
      LATER,
    );
    await plans.insert(plan);
    for (const parcel of plan.buildParcels({ category: null, tags: [] }, LATER)) {
      await repository.save(parcel);
    }
    await repository.save(buildTestTransaction({ accountId }));

    const parcels = await repository.findByInstallmentPlanIds([plan.id]);
    const found = await plans.findById(plan.id);

    expect(parcels.map((parcel) => parcel.installment?.number).sort()).toEqual([1, 2, 3]);
    expect(found).toEqual(plan);
    expect(await plans.list({ accountId: card })).toEqual([plan]);
    expect(await plans.list({ accountId })).toEqual([]);

    await plans.delete(plan.id);
    expect(await repository.findByInstallmentPlanIds([plan.id])).toEqual([]);
    expect(await database.db.selectFrom('transactions').select('id').execute()).toHaveLength(1);
  });

  it('rolls back the whole unit of work when a write fails', async () => {
    const unitOfWork = new KyselyUnitOfWork(database.db);
    const first = buildTestTransaction({ accountId });
    const broken = buildTestTransaction({ accountId, tagIds: ['no-such-tag'] });

    await expect(
      unitOfWork.run(async (executor) => {
        await repository.save(first, executor);
        await repository.save(broken, executor);
      }),
    ).rejects.toThrow();

    expect(await database.db.selectFrom('transactions').select('id').execute()).toEqual([]);
  });

  it('finds the other leg of a transfer in another account, and deleting the account frees it', async () => {
    const other = await insertTestAccount(database.db, { name: 'Poupança' });
    const out = buildTestTransaction({ accountId, amount: Money.fromCents(-5000) });
    const into = buildTestTransaction({
      accountId: other,
      nature: 'income',
      amount: Money.fromCents(5000),
    });
    // Both exist before they point at each other (the foreign key checks the other leg).
    await repository.save(out);
    await repository.save(into);
    out.changeNature('transfer', { hasActiveInvoiceLink: false, isCardAccount: false }, LATER);
    Transaction.linkTransfer(
      out,
      into,
      { secondHasInvoiceLink: false, secondIsCardAccount: false },
      LATER,
    );
    await repository.save(out);
    await repository.save(into);

    const counterparts = await repository.findTransferCounterpartsOfAccount(accountId);
    expect(counterparts.map((transaction) => transaction.id)).toEqual([into.id]);

    await repository.deleteByAccount(accountId);

    expect(await repository.findById(out.id)).toBeNull();
    expect((await repository.findById(into.id))?.transferCounterpartId).toBeNull();
  });
});

describe('the split value object', () => {
  it('knows the parts of a friend', () => {
    const part = (nature: TransactionSplit.Nature) =>
      new TransactionSplit({
        id: 'x',
        position: 1,
        amount: Money.fromCents(-1),
        nature,
        categoryId: null,
        description: null,
      });

    expect(part('lent').isOutsideSpending()).toBe(true);
    expect(part('reimbursed').isOutsideSpending()).toBe(true);
    expect(part('expense').isOutsideSpending()).toBe(false);
    expect(part('income').isOutsideSpending()).toBe(false);
  });
});
