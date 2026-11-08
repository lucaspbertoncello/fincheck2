import type { Kysely } from 'kysely';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Database } from '#/database/database.type.ts';
import { LinkInvoicePaymentUseCase } from '#/modules/transactions/application/invoice-payment/link-invoice-payment.usecase.ts';
import { UnlinkInvoicePaymentUseCase } from '#/modules/transactions/application/invoice-payment/unlink-invoice-payment.usecase.ts';
import type { TransactionAccountReader } from '#/modules/transactions/application/transaction/transaction-account-reader.interface.ts';
import { KyselyTransactionRepository } from '#/modules/transactions/infra/transaction/transaction.repository.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const NOW = '2026-11-06T15:00:00.000Z';
const BEFORE = '2026-11-06T12:00:00.000Z';

// A reader of accounts for the test: it reads the table, as the real one does through `accounts`.
function createTestAccountReader(db: Kysely<Database>): TransactionAccountReader {
  return {
    async requireAccount(accountId, executor = db) {
      const row = await executor
        .selectFrom('accounts')
        .select(['id', 'type', 'archived_at'])
        .where('id', '=', accountId)
        .executeTakeFirstOrThrow();

      return {
        id: row.id,
        isCard: row.type === 'credit_card',
        isArchived: row.archived_at !== null,
      };
    },
  };
}

// `invoices` calls this use case when the payment of an invoice is undone and when the card goes.
describe('UnlinkInvoicePaymentUseCase', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let unlink: UnlinkInvoicePaymentUseCase;
  let link: LinkInvoicePaymentUseCase;
  let checking: string;
  let card: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    const repository = new KyselyTransactionRepository(database.db);
    const clock = createFixedClock(NOW);
    unlink = new UnlinkInvoicePaymentUseCase(
      repository,
      createTestAccountReader(database.db),
      clock,
    );
    link = new LinkInvoicePaymentUseCase(repository, clock);
    checking = await insertTestAccount(database.db, { name: 'Nubank' });
    card = await insertTestCreditCard(database.db);
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

  // A transaction Lucas turned into a payment.
  const markedByUser = (
    accountId: string,
    overrides: Parameters<typeof insertTestTransaction>[2] = {},
  ) =>
    insertTestTransaction(database.db, accountId, {
      nature: 'invoice_payment',
      nature_set_by: 'user',
      updated_at: BEFORE,
      ...overrides,
    });

  describe('what Lucas turned into a payment goes back by its sign', () => {
    it('a negative amount on an ordinary account is an expense', async () => {
      const id = await markedByUser(checking, { amount_cents: -50000 });

      await unlink.execute(id, database.db);

      expect(await rowOf(id)).toMatchObject({
        nature: 'expense',
        nature_set_by: 'system',
        amount_cents: -50000,
        updated_at: NOW,
      });
    });

    it('a positive amount on an ordinary account is an income', async () => {
      const id = await markedByUser(checking, { amount_cents: 50000 });

      await unlink.execute(id, database.db);

      expect(await rowOf(id)).toMatchObject({
        nature: 'income',
        nature_set_by: 'system',
        updated_at: NOW,
      });
    });

    it('a positive amount on a card is an expense (a refund), never an income', async () => {
      const id = await markedByUser(card, {
        method: 'credit',
        invoice_month: '2026-11',
        amount_cents: 50000,
      });

      await unlink.execute(id, database.db);

      expect(await rowOf(id)).toMatchObject({
        nature: 'expense',
        nature_set_by: 'system',
        invoice_month: '2026-11',
      });
    });

    it('a negative amount on a card is an expense', async () => {
      const id = await markedByUser(card, { method: 'credit', amount_cents: -50000 });

      await unlink.execute(id, database.db);

      expect(await rowOf(id)).toMatchObject({ nature: 'expense', nature_set_by: 'system' });
    });

    it('does not touch the amount, the description, the date or the account', async () => {
      const id = await markedByUser(checking, {
        amount_cents: -50000,
        description: 'Pix para o banco',
        occurred_on: '2026-11-10',
      });

      await unlink.execute(id, database.db);

      expect(await rowOf(id)).toMatchObject({
        account_id: checking,
        amount_cents: -50000,
        description: 'Pix para o banco',
        occurred_on: '2026-11-10',
        origin: 'manual',
        method: 'pix',
      });
    });

    it('undoes what the link did: an expense linked and unlinked is an expense again', async () => {
      const id = await insertTestTransaction(database.db, checking, { amount_cents: -50000 });

      await link.execute(id, database.db);
      expect(await rowOf(id)).toMatchObject({ nature: 'invoice_payment', nature_set_by: 'user' });
      await unlink.execute(id, database.db);

      expect(await rowOf(id)).toMatchObject({ nature: 'expense', nature_set_by: 'system' });
    });

    it('undoes what the link did: an income linked and unlinked is an income again', async () => {
      const id = await insertTestTransaction(database.db, checking, {
        nature: 'income',
        amount_cents: 20000,
      });

      await link.execute(id, database.db);
      await unlink.execute(id, database.db);

      expect(await rowOf(id)).toMatchObject({ nature: 'income', nature_set_by: 'system' });
    });
  });

  describe('what the system marked stays as it is', () => {
    it('a payment marked by the import detector stays a payment', async () => {
      const id = await insertTestTransaction(database.db, checking, {
        origin: 'bank',
        nature: 'invoice_payment',
        nature_set_by: 'system',
        amount_cents: -50000,
        updated_at: BEFORE,
      });
      const before = await rowOf(id);

      await unlink.execute(id, database.db);

      expect(await rowOf(id)).toEqual(before);
    });

    it('stays a payment even after a link that only confirmed it', async () => {
      const id = await insertTestTransaction(database.db, checking, {
        origin: 'bank',
        nature: 'invoice_payment',
        nature_set_by: 'system',
        amount_cents: -50000,
      });

      await link.execute(id, database.db);
      await unlink.execute(id, database.db);

      expect(await rowOf(id)).toMatchObject({ nature: 'invoice_payment', nature_set_by: 'system' });
    });
  });

  describe('what is not a payment does not change', () => {
    it.each(['expense', 'income', 'transfer', 'lent', 'reimbursed', 'balance_adjustment'] as const)(
      'a transaction of nature %s is left alone',
      async (nature) => {
        const id = await insertTestTransaction(database.db, checking, {
          nature,
          nature_set_by: 'user',
          amount_cents: -1500,
          updated_at: BEFORE,
        });
        const before = await rowOf(id);

        await unlink.execute(id, database.db);

        expect(await rowOf(id)).toEqual(before);
      },
    );
  });

  it('refuses an id that does not exist with TRANSACTION_NOT_FOUND', async () => {
    await expect(unlink.execute(generateId(), database.db)).rejects.toMatchObject({
      code: 'TRANSACTION_NOT_FOUND',
    });
  });
});
