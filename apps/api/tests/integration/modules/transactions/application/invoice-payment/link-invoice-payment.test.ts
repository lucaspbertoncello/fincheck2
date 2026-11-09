import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LinkInvoicePaymentUseCase } from '#/modules/transactions/application/invoice-payment/link-invoice-payment.usecase.ts';
import { KyselyTransactionRepository } from '#/modules/transactions/infra/transaction/transaction.repository.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { insertTestTag } from '#tests/support/categories/tag/insert-test-tag.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';
const BEFORE = '2026-11-06T12:00:00.000Z';

// `invoices` calls this use case, in its own unit of work, when a transaction pays an invoice.
describe('LinkInvoicePaymentUseCase', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let useCase: LinkInvoicePaymentUseCase;
  let checking: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    useCase = new LinkInvoicePaymentUseCase(
      new KyselyTransactionRepository(database.db),
      createFixedClock(NOW),
    );
    checking = await insertTestAccount(database.db, { name: 'Nubank' });
  });

  afterEach(async () => {
    await database.destroy();
  });

  const rowOf = (id: string) =>
    database.db
      .selectFrom('transactions')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirstOrThrow();

  const insertSplit = (transactionId: string, position: number, amountCents: number) =>
    database.db
      .insertInto('transaction_splits')
      .values({
        id: generateId(),
        transaction_id: transactionId,
        position,
        amount_cents: amountCents,
        nature: 'expense',
        category_id: null,
        description: null,
      })
      .execute();

  const insertRule = async (categoryId: string) => {
    const id = generateId();
    await database.db
      .insertInto('category_rules')
      .values({
        id,
        description_contains: 'FATURA',
        counterparty_contains: null,
        kind: null,
        account_id: null,
        amount_min_cents: null,
        amount_max_cents: null,
        category_id: categoryId,
        enabled: 1,
        created_at: BEFORE,
        updated_at: BEFORE,
      })
      .execute();

    return id;
  };

  it('turns an expense into an invoice payment chosen by Lucas, and saves it', async () => {
    const id = await insertTestTransaction(database.db, checking, {
      description: 'Pix para o banco',
      amount_cents: -73000,
      occurred_on: '2026-11-10',
      method: 'pix',
    });

    await useCase.execute(id, database.db);

    expect(await rowOf(id)).toMatchObject({
      id,
      account_id: checking,
      origin: 'manual',
      nature: 'invoice_payment',
      nature_set_by: 'user',
      method: 'pix',
      description: 'Pix para o banco',
      amount_cents: -73000,
      occurred_on: '2026-11-10',
      category_id: null,
      category_source: null,
      category_rule_id: null,
      ignored_at: null,
      updated_at: NOW,
    });
  });

  it('also takes an income (a credit on the card that was read as income)', async () => {
    const id = await insertTestTransaction(database.db, checking, {
      nature: 'income',
      amount_cents: 20000,
    });

    await useCase.execute(id, database.db);

    expect(await rowOf(id)).toMatchObject({ nature: 'invoice_payment', nature_set_by: 'user' });
  });

  it('clears the category, its source and its rule', async () => {
    const food = await insertTestCategory(database.db);
    const rule = await insertRule(food);
    const byRule = await insertTestTransaction(database.db, checking, {
      category_id: food,
      category_source: 'rule',
      category_rule_id: rule,
    });
    const byUser = await insertTestTransaction(database.db, checking, {
      category_id: food,
      category_source: 'user',
    });

    await useCase.execute(byRule, database.db);
    await useCase.execute(byUser, database.db);

    for (const id of [byRule, byUser]) {
      expect(await rowOf(id)).toMatchObject({
        nature: 'invoice_payment',
        category_id: null,
        category_source: null,
        category_rule_id: null,
      });
    }
  });

  it('leaves the rest of the transaction alone: bank version and edit note; the tags go with the category', async () => {
    const category = await insertTestCategory(database.db);
    const tag = await insertTestTag(database.db, { category_id: category });
    const id = await insertTestTransaction(database.db, checking, {
      category_id: category,
      category_source: 'user',
      origin: 'bank',
      nature_set_by: 'system',
      description: 'PIX ENVIADO',
      bank_description: 'PIX ENVIADO',
      bank_amount_cents: -1250,
      bank_occurred_on: '2026-11-05',
      bank_status: 'posted',
      edit_note: 'nota',
    });
    await database.db
      .insertInto('transaction_tags')
      .values({ transaction_id: id, tag_id: tag })
      .execute();

    await useCase.execute(id, database.db);

    expect(await rowOf(id)).toMatchObject({
      origin: 'bank',
      description: 'PIX ENVIADO',
      bank_description: 'PIX ENVIADO',
      bank_amount_cents: -1250,
      bank_occurred_on: '2026-11-05',
      bank_status: 'posted',
      edit_note: 'nota',
      nature: 'invoice_payment',
    });
    expect(
      await database.db
        .selectFrom('transaction_tags')
        .select('tag_id')
        .where('transaction_id', '=', id)
        .execute(),
    ).toEqual([]);
    expect(tag).toBeDefined();
  });

  it('keeps the mark of the system on a transaction the detector already marked as a payment', async () => {
    const id = await insertTestTransaction(database.db, checking, {
      origin: 'bank',
      nature: 'invoice_payment',
      nature_set_by: 'system',
      amount_cents: -50000,
      updated_at: BEFORE,
    });

    await useCase.execute(id, database.db);

    expect(await rowOf(id)).toMatchObject({
      nature: 'invoice_payment',
      nature_set_by: 'system',
      origin: 'bank',
      updated_at: BEFORE,
    });
  });

  it('keeps the mark of Lucas when it is linked a second time', async () => {
    const id = await insertTestTransaction(database.db, checking, { amount_cents: -50000 });

    await useCase.execute(id, database.db);
    await useCase.execute(id, database.db);

    expect(await rowOf(id)).toMatchObject({ nature: 'invoice_payment', nature_set_by: 'user' });
  });

  it('refuses a transfer, a debt, a refund of debt and an adjustment with TRANSACTION_NATURE_LOCKED', async () => {
    for (const nature of ['transfer', 'lent', 'reimbursed', 'balance_adjustment'] as const) {
      const id = await insertTestTransaction(database.db, checking, { nature });
      const before = await rowOf(id);

      await expect(useCase.execute(id, database.db)).rejects.toMatchObject({
        code: 'TRANSACTION_NATURE_LOCKED',
      });
      expect(await rowOf(id)).toEqual(before);
    }
  });

  it('refuses a split transaction with TRANSACTION_IS_SPLIT', async () => {
    const id = await insertTestTransaction(database.db, checking, { amount_cents: -1000 });
    await insertSplit(id, 1, -400);
    await insertSplit(id, 2, -600);
    const before = await rowOf(id);

    await expect(useCase.execute(id, database.db)).rejects.toMatchObject({
      code: 'TRANSACTION_IS_SPLIT',
    });
    expect(await rowOf(id)).toEqual(before);
  });

  it('refuses an id that does not exist with TRANSACTION_NOT_FOUND', async () => {
    await expect(useCase.execute(generateId(), database.db)).rejects.toMatchObject({
      code: 'TRANSACTION_NOT_FOUND',
    });
  });

  it('works on a transaction of a card too', async () => {
    const card = await insertTestCreditCard(database.db);
    const id = await insertTestTransaction(database.db, card, {
      method: 'credit',
      invoice_month: '2026-11',
      amount_cents: 50000,
    });

    await useCase.execute(id, database.db);

    expect(await rowOf(id)).toMatchObject({
      account_id: card,
      nature: 'invoice_payment',
      nature_set_by: 'user',
      invoice_month: '2026-11',
    });
  });
});
