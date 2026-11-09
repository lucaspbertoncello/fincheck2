import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createSyncTestWorld,
  SYNC_TEST_ITEM_ID,
} from '#tests/support/sync/connection/create-sync-test-world.util.ts';
import {
  buildTestBankAccount,
  buildTestBankCard,
  buildTestBankTransaction,
  buildTestItem,
} from '#tests/support/sync/provider/build-test-bank-data.util.ts';

const CHECKING = 'pluggy-account-checking';
const CARD = 'pluggy-account-card';

describe('a round of the sync, complete', () => {
  let world: Awaited<ReturnType<typeof createSyncTestWorld>>;

  beforeEach(async () => {
    world = await createSyncTestWorld();
    await world.saveKeys();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const bankRows = async (pluggyAccountId: string) =>
    world.transactionsOf(await world.accountIdOf(pluggyAccountId));

  describe('accounts and balances', () => {
    it('creates the accounts with the balance of the bank as a fact, and the card with the data the bank sent', async () => {
      world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankAccount(), buildTestBankCard()]);

      const connection = await world.connect();

      expect(connection.accounts.map((account) => account.type)).toEqual([
        'checking',
        'credit_card',
      ]);
      const accounts = await world.accountsTable();
      expect(
        accounts.map((account) => [account.type, account.source, account.bank_balance_cents]),
      ).toEqual([
        ['checking', 'pluggy', 100000],
        ['credit_card', 'pluggy', 25000],
      ]);
      expect(accounts.every((account) => account.institution_code === 'nubank')).toBe(true);
      const card = await world.database.db
        .selectFrom('credit_cards')
        .selectAll()
        .executeTakeFirstOrThrow();
      expect(card).toMatchObject({
        brand: 'visa',
        last4: '1234',
        closing_day: 5,
        due_day: 12,
        limit_cents: 500000,
      });
    });

    describe('a MeuPluggy connection', () => {
      const meuPluggy = () =>
        buildTestItem({ institutionName: 'MeuPluggy', institutionCode: 'other' });

      it('creates the account with the bank it comes from, not the name of the connector', async () => {
        world.provider.items.set(SYNC_TEST_ITEM_ID, meuPluggy());
        world.provider.accounts.set(SYNC_TEST_ITEM_ID, [
          buildTestBankAccount({ institution: { name: 'Nubank', code: 'nubank' } }),
        ]);

        await world.connect();

        const [account] = await world.accountsTable();
        expect(account).toMatchObject({ institution_code: 'nubank', institution_name: null });
      });

      it('keeps the name of a bank that is not pre-registered', async () => {
        world.provider.items.set(SYNC_TEST_ITEM_ID, meuPluggy());
        world.provider.accounts.set(SYNC_TEST_ITEM_ID, [
          buildTestBankAccount({ institution: { name: 'Banco Pequeno', code: 'other' } }),
        ]);

        await world.connect();

        const [account] = await world.accountsTable();
        expect(account).toMatchObject({
          institution_code: 'other',
          institution_name: 'Banco Pequeno',
        });
      });

      it('keeps the name of the connector when the account brings no bank', async () => {
        world.provider.items.set(SYNC_TEST_ITEM_ID, meuPluggy());
        world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankAccount()]);

        await world.connect();

        const [account] = await world.accountsTable();
        expect(account).toMatchObject({ institution_code: 'other', institution_name: 'MeuPluggy' });
      });

      it('does not undo what Lucas edited on the next round', async () => {
        world.provider.items.set(SYNC_TEST_ITEM_ID, meuPluggy());
        world.provider.accounts.set(SYNC_TEST_ITEM_ID, [
          buildTestBankAccount({ institution: { name: 'Nubank', code: 'nubank' } }),
        ]);
        const connection = await world.connect();
        const checkingId = await world.accountIdOf(CHECKING);
        await world.send('PATCH', `/accounts/${checkingId}`, {
          name: 'Minha conta',
          institutionCode: 'other',
          institutionName: 'Meu banco',
        });
        world.moveTo('2026-11-09T18:00:00.000Z');

        await world.retry(connection.id);

        const [account] = await world.accountsTable();
        expect(account).toMatchObject({
          name: 'Minha conta',
          institution_code: 'other',
          institution_name: 'Meu banco',
        });
      });
    });

    it('records the amount used on a card as a positive number', async () => {
      world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankCard({ balanceCents: -25000 })]);

      await world.connect();

      const [card] = await world.accountsTable();
      expect(card?.bank_balance_cents).toBe(25000);
    });

    it('a card the bank sent without closing and due day gets the usual ones, and Lucas can correct them', async () => {
      world.provider.accounts.set(SYNC_TEST_ITEM_ID, [
        buildTestBankCard({
          card: { brand: 'elo', closingDay: null, dueDay: 20, limitCents: null },
        }),
      ]);

      await world.connect();

      const card = await world.database.db
        .selectFrom('credit_cards')
        .selectAll()
        .executeTakeFirstOrThrow();
      expect(card).toMatchObject({ brand: 'elo', closing_day: 13, due_day: 20, limit_cents: null });
    });

    it('the next round brings the new balance and does not rename the account nor overwrite what Lucas corrected on the card', async () => {
      world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankAccount(), buildTestBankCard()]);
      const connection = await world.connect();
      const cardId = await world.accountIdOf(CARD);
      const checkingId = await world.accountIdOf(CHECKING);
      await world.send('PATCH', `/accounts/${checkingId}`, { name: 'Minha conta' });
      await world.send('PATCH', `/accounts/${cardId}`, {
        creditCard: { closingDay: 20, limitCents: 900000 },
      });
      world.provider.accounts.set(SYNC_TEST_ITEM_ID, [
        buildTestBankAccount({ balanceCents: 123456, name: 'Outro nome' }),
        buildTestBankCard({
          balanceCents: 1,
          card: { brand: 'visa', closingDay: 9, dueDay: 28, limitCents: 1 },
        }),
      ]);
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      const accounts = await world.accountsTable();
      const checking = accounts.find((account) => account.id === checkingId);
      expect(checking).toMatchObject({
        name: 'Minha conta',
        bank_balance_cents: 123456,
        bank_balance_at: '2026-11-09T18:00:00.000Z',
      });
      const card = await world.database.db
        .selectFrom('credit_cards')
        .selectAll()
        .executeTakeFirstOrThrow();
      expect(card).toMatchObject({ closing_day: 20, limit_cents: 900000, last4: '1234' });
    });

    it('an account that is archived is ignored: its balance and its transactions are not imported', async () => {
      world.provider.transactions.set(CHECKING, [buildTestBankTransaction({ id: 'a1' })]);
      const connection = await world.connect();
      const checkingId = await world.accountIdOf(CHECKING);
      await world.send('POST', `/accounts/${checkingId}/archive`);
      world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankAccount({ balanceCents: 5 })]);
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1' }),
        buildTestBankTransaction({ id: 'a2', description: 'Novo' }),
      ]);
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      expect(await bankRows(CHECKING)).toHaveLength(1);
      const [account] = await world.accountsTable();
      expect(account?.bank_balance_cents).toBe(100000);
    });
  });

  describe('transactions', () => {
    it('imports with the sign of Lucas, the original of the bank and the nature by the sign; money is whole cents', async () => {
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({
          id: 'out',
          description: 'Mercado Central',
          amountCents: -15990,
          counterparty: 'Mercado Central Ltda',
        }),
        buildTestBankTransaction({
          id: 'in',
          description: 'Salário',
          amountCents: 500000,
          method: 'transfer',
          counterparty: 'Empresa SA',
        }),
      ]);

      await world.connect();

      const rows = await bankRows(CHECKING);
      const first = rows.find((row) => row.description === 'Mercado Central');
      const second = rows.find((row) => row.description === 'Salário');
      expect(first).toMatchObject({
        origin: 'bank',
        nature: 'expense',
        nature_set_by: 'system',
        amount_cents: -15990,
        description: 'Mercado Central',
        bank_description: 'Mercado Central',
        bank_amount_cents: -15990,
        bank_occurred_on: '2026-11-05',
        bank_counterparty: 'Mercado Central Ltda',
        bank_status: 'posted',
        method: 'pix',
        invoice_month: null,
      });
      expect(second).toMatchObject({ nature: 'income', amount_cents: 500000, method: 'transfer' });
      expect(Number.isInteger(first?.amount_cents)).toBe(true);
    });

    it('imports the same window again without creating, duplicating or changing anything (idempotency)', async () => {
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1' }),
        buildTestBankTransaction({ id: 'a2', description: 'Outra' }),
      ]);
      const connection = await world.connect();
      const before = await bankRows(CHECKING);
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);
      await world.retry(connection.id);

      expect(await bankRows(CHECKING)).toEqual(before);
      expect(
        await world.database.db.selectFrom('sync_transaction_links').selectAll().execute(),
      ).toHaveLength(2);
      const runs = await world.runsOf(connection.id);
      expect(
        runs.slice(0, 2).map((run) => [run.createdCount, run.updatedCount, run.removedCount]),
      ).toEqual([
        [0, 0, 0],
        [0, 0, 0],
      ]);
    });

    it('a new transaction in a later round is created, and only that one', async () => {
      world.provider.transactions.set(CHECKING, [buildTestBankTransaction({ id: 'a1' })]);
      const connection = await world.connect();
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1' }),
        buildTestBankTransaction({ id: 'a2', description: 'Nova', occurredOn: '2026-11-08' }),
      ]);
      world.moveTo('2026-11-09T18:00:00.000Z');

      const run = await world.retry(connection.id);

      expect(run).toMatchObject({ createdCount: 1 });
      expect(await bankRows(CHECKING)).toHaveLength(2);
    });

    it('later rounds ask the Pluggy from the cursor minus 30 days, the first one from a year back', async () => {
      const connection = await world.connect();
      world.moveTo('2026-11-09T18:00:00.000Z');
      await world.retry(connection.id);

      expect(world.provider.fromOn.map((call) => call.fromOn)).toEqual([
        '2025-11-09',
        '2026-10-10',
      ]);
    });

    it('a transaction the bank changed follows the bank when Lucas did not edit it', async () => {
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1', description: 'Mercado', amountCents: -1000 }),
      ]);
      const connection = await world.connect();
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1', description: 'Mercado Central', amountCents: -1500 }),
      ]);
      world.moveTo('2026-11-09T18:00:00.000Z');

      const run = await world.retry(connection.id);

      expect(run.updatedCount).toBe(1);
      expect((await bankRows(CHECKING))[0]).toMatchObject({
        description: 'Mercado Central',
        amount_cents: -1500,
        bank_description: 'Mercado Central',
        bank_amount_cents: -1500,
        bank_change_json: null,
      });
    });

    it('a transaction Lucas edited by hand is protected: his version stays, the original of the bank is updated and the change waits for him', async () => {
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1', description: 'Mercado', amountCents: -1000 }),
      ]);
      const connection = await world.connect();
      const [imported] = await bankRows(CHECKING);
      const edited = await world.send('PATCH', `/transactions/${imported?.id ?? ''}`, {
        description: 'Compra do mês',
      });
      expect(edited.status).toBe(200);
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1', description: 'Mercado Central', amountCents: -1500 }),
      ]);
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      const [after] = await bankRows(CHECKING);
      expect(after).toMatchObject({
        // What Lucas wrote stays; the amount he did not touch follows the bank.
        description: 'Compra do mês',
        amount_cents: -1500,
        bank_description: 'Mercado Central',
        bank_amount_cents: -1500,
      });
      expect(JSON.parse(after?.bank_change_json ?? 'null')).toEqual([
        { field: 'description', before: 'Mercado', after: 'Mercado Central' },
      ]);
      expect(after?.bank_changed_at).toBe('2026-11-09T18:00:00.000Z');
    });

    it('the category Lucas chose is never changed by the sync', async () => {
      world.provider.transactions.set(CHECKING, [buildTestBankTransaction({ id: 'a1' })]);
      const connection = await world.connect();
      const [imported] = await bankRows(CHECKING);
      const categoryId = await world.categoryIdOf('expense');
      await world.send('PATCH', `/transactions/${imported?.id ?? ''}`, { categoryId });
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1', description: 'Mudou', amountCents: -9999 }),
      ]);
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      expect((await bankRows(CHECKING))[0]).toMatchObject({
        category_id: categoryId,
        category_source: 'user',
      });
    });

    it('a transaction the bank stopped sending is marked removed, not deleted; it comes back when the bank sends it again', async () => {
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1', occurredOn: '2026-11-05' }),
        buildTestBankTransaction({
          id: 'a2',
          description: 'Some',
          occurredOn: '2026-11-06',
          amountCents: -777,
        }),
      ]);
      const connection = await world.connect();
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1', occurredOn: '2026-11-05' }),
      ]);
      world.moveTo('2026-11-09T18:00:00.000Z');

      const run = await world.retry(connection.id);

      expect(run.removedCount).toBe(1);
      const rows = await bankRows(CHECKING);
      expect(rows).toHaveLength(2);
      expect(rows.find((row) => row.bank_removed_at !== null)).toMatchObject({
        description: 'Some',
        bank_removed_at: '2026-11-09T18:00:00.000Z',
      });

      // Idempotent: a second round does not count it again.
      expect((await world.retry(connection.id)).removedCount).toBe(0);

      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1', occurredOn: '2026-11-05' }),
        buildTestBankTransaction({
          id: 'a2',
          description: 'Some',
          occurredOn: '2026-11-06',
          amountCents: -777,
        }),
      ]);
      await world.retry(connection.id);
      expect((await bankRows(CHECKING)).every((row) => row.bank_removed_at === null)).toBe(true);
    });

    it('only what the window covers can be removed: an old transaction outside it is not a removal', async () => {
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({
          id: 'old',
          description: 'Antiga',
          occurredOn: '2026-03-01',
          amountCents: -300,
        }),
        buildTestBankTransaction({ id: 'a1', occurredOn: '2026-11-05' }),
      ]);
      const connection = await world.connect();
      world.moveTo('2026-11-09T18:00:00.000Z');

      // The window of the next round starts 30 days before the cursor (09/10): the old one is out of it.
      await world.retry(connection.id);

      expect((await bankRows(CHECKING)).every((row) => row.bank_removed_at === null)).toBe(true);
    });

    it('the Pluggy recreating a transaction with another id (same providerId) is the same transaction, with the bank version applied', async () => {
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1', providerRef: 'OF-1', description: 'Mercado' }),
      ]);
      const connection = await world.connect();
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({
          id: 'a1-new',
          providerRef: 'OF-1',
          description: 'Mercado Central',
        }),
      ]);
      world.moveTo('2026-11-09T18:00:00.000Z');

      const run = await world.retry(connection.id);

      expect(run).toMatchObject({ createdCount: 0, updatedCount: 1, removedCount: 0 });
      const rows = await bankRows(CHECKING);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ description: 'Mercado Central', bank_removed_at: null });
      const links = await world.database.db
        .selectFrom('sync_transaction_links')
        .selectAll()
        .execute();
      expect(links.map((link) => link.pluggy_transaction_id)).toEqual(['a1-new']);
    });

    it('the Pluggy recreating it with another id and no providerId matches by two of three fields', async () => {
      world.provider.transactions.set(CHECKING, [buildTestBankTransaction({ id: 'a1' })]);
      const connection = await world.connect();
      world.provider.transactions.set(CHECKING, [buildTestBankTransaction({ id: 'a1-new' })]);
      world.moveTo('2026-11-09T18:00:00.000Z');

      const run = await world.retry(connection.id);

      expect(run).toMatchObject({ createdCount: 0, removedCount: 0 });
      expect(await bankRows(CHECKING)).toHaveLength(1);
    });
  });

  describe('card', () => {
    beforeEach(() => {
      world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankCard()]);
    });

    it('puts each purchase in the invoice its date falls in (closing on the 5th, inclusive)', async () => {
      world.provider.transactions.set(CARD, [
        buildTestBankTransaction({ id: 'c1', occurredOn: '2026-11-05', method: 'credit' }),
        buildTestBankTransaction({
          id: 'c2',
          occurredOn: '2026-11-06',
          method: 'credit',
          amountCents: -100,
        }),
      ]);

      await world.connect();

      expect(
        (await bankRows(CARD)).map((row) => [row.occurred_on, row.invoice_month, row.method]),
      ).toEqual([
        ['2026-11-05', '2026-11', 'credit'],
        ['2026-11-06', '2026-12', 'credit'],
      ]);
    });

    it('when the date of a purchase changes on the bank, the invoice is worked out again', async () => {
      world.provider.transactions.set(CARD, [
        buildTestBankTransaction({ id: 'c1', occurredOn: '2026-11-05', method: 'credit' }),
      ]);
      const connection = await world.connect();
      world.provider.transactions.set(CARD, [
        buildTestBankTransaction({ id: 'c1', occurredOn: '2026-11-07', method: 'credit' }),
      ]);
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      expect((await bankRows(CARD))[0]).toMatchObject({
        occurred_on: '2026-11-07',
        invoice_month: '2026-12',
      });
    });

    it('a date Lucas moved is kept, and so is the invoice it already had', async () => {
      world.provider.transactions.set(CARD, [
        buildTestBankTransaction({ id: 'c1', occurredOn: '2026-11-05', method: 'credit' }),
      ]);
      const connection = await world.connect();
      const [purchase] = await bankRows(CARD);
      await world.send('PATCH', `/transactions/${purchase?.id ?? ''}`, {
        occurredOn: '2026-11-03',
      });
      world.provider.transactions.set(CARD, [
        buildTestBankTransaction({ id: 'c1', occurredOn: '2026-11-08', method: 'credit' }),
      ]);
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      const [after] = await bankRows(CARD);
      expect(after).toMatchObject({ occurred_on: '2026-11-03', bank_occurred_on: '2026-11-08' });
      expect(after?.bank_change_json).not.toBeNull();
    });

    it('records the total of the invoices the bank closed as the total of the bank, never touching a correction of Lucas', async () => {
      world.provider.invoices.set(CARD, [
        { id: 'b1', dueOn: '2026-10-12', totalCents: 128490 },
        { id: 'b2', dueOn: '2026-11-12', totalCents: 5000 },
      ]);
      await world.connect();
      const cardId = await world.accountIdOf(CARD);
      const rows = await world.database.db
        .selectFrom('invoices')
        .selectAll()
        .where('account_id', '=', cardId)
        .orderBy('month')
        .execute();

      expect(
        rows.map((row) => [row.month, row.due_on, row.bank_total_cents, row.total_override_cents]),
      ).toEqual([
        // 12/10 is a holiday: the cycle moves the due date to the next business day.
        ['2026-10', '2026-10-13', 128490, null],
        ['2026-11', '2026-11-12', 5000, null],
      ]);

      await world.send('PATCH', `/cards/${cardId}/invoices/2026-10`, {
        totalOverrideCents: 100000,
      });
      world.provider.invoices.set(CARD, [{ id: 'b1', dueOn: '2026-10-12', totalCents: 130000 }]);
      world.moveTo('2026-11-09T18:00:00.000Z');
      const connection = (await world.connectionsOf())[0];
      await world.retry(connection?.id ?? '');

      const october = await world.database.db
        .selectFrom('invoices')
        .selectAll()
        .where('account_id', '=', cardId)
        .where('month', '=', '2026-10')
        .executeTakeFirstOrThrow();
      expect(october).toMatchObject({ bank_total_cents: 130000, total_override_cents: 100000 });
    });
  });

  describe('the state of the connection and the errors', () => {
    it.each([['CONSENT_REVOKED' as const], ['LOGIN_ERROR' as const], ['PROVIDER_ERROR' as const]])(
      'an item in error (%s) ends the run with the code and moves the connection to error, without reading the data',
      async (errorCode) => {
        const connection = await world.connect();
        world.provider.items.set(SYNC_TEST_ITEM_ID, buildTestItem({ state: 'error', errorCode }));
        world.provider.calls.length = 0;
        world.moveTo('2026-11-09T18:00:00.000Z');

        await world.retry(connection.id);

        expect(await world.connectionsOf()).toMatchObject([{ status: 'error', errorCode }]);
        expect((await world.runsOf(connection.id))[0]).toMatchObject({
          status: 'error',
          errorCode,
        });
        expect(world.provider.calls).toEqual([`getItem:${SYNC_TEST_ITEM_ID}`]);
      },
    );

    it('an item that is fine but with no news from the bank for more than 3 days is STALE_DATA', async () => {
      const connection = await world.connect();
      world.provider.items.set(
        SYNC_TEST_ITEM_ID,
        buildTestItem({ lastUpdatedAt: '2026-11-05T10:00:00.000Z' }),
      );
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      // The error is the Pluggy's word, but the date of the last update stays the one of the last data
      // that Fincheck imported: a round that imported nothing does not make old data look fresh.
      expect(await world.connectionsOf()).toMatchObject([
        { status: 'error', errorCode: 'STALE_DATA', lastBankUpdateAt: '2026-11-09T13:00:00.000Z' },
      ]);
    });

    it('a recent update that is only 36 hours old is the selo, not an error', async () => {
      const connection = await world.connect();
      world.provider.items.set(
        SYNC_TEST_ITEM_ID,
        buildTestItem({ lastUpdatedAt: '2026-11-07T10:00:00.000Z' }),
      );
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      expect(await world.connectionsOf()).toMatchObject([{ status: 'active', isStale: true }]);
    });

    it('a connection in error recovers by itself when the same item comes back, and is read again', async () => {
      world.provider.transactions.set(CHECKING, [buildTestBankTransaction({ id: 'a1' })]);
      const connection = await world.connect();
      world.provider.items.set(
        SYNC_TEST_ITEM_ID,
        buildTestItem({ state: 'error', errorCode: 'LOGIN_ERROR' }),
      );
      world.moveTo('2026-11-09T18:00:00.000Z');
      await world.retry(connection.id);
      world.provider.items.set(SYNC_TEST_ITEM_ID, buildTestItem());
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1' }),
        buildTestBankTransaction({ id: 'a2', description: 'Depois' }),
      ]);
      world.moveTo('2026-11-09T20:00:00.000Z');

      // The scheduled round also looks at connections in error.
      const { ranCount } = await world.parts.runDueConnections.run();

      expect(ranCount).toBe(1);
      expect(await world.connectionsOf()).toMatchObject([{ status: 'active', errorCode: null }]);
      expect(await bankRows(CHECKING)).toHaveLength(2);
    });

    it('not reaching the Pluggy ends the run as PROVIDER_ERROR and leaves a connection that was working active, with nothing written', async () => {
      world.provider.transactions.set(CHECKING, [buildTestBankTransaction({ id: 'a1' })]);
      const connection = await world.connect();
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1' }),
        buildTestBankTransaction({ id: 'a2', description: 'Nova' }),
      ]);
      world.provider.fail('listTransactions', 'unavailable');
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      expect(await world.connectionsOf()).toMatchObject([{ status: 'active', errorCode: null }]);
      expect((await world.runsOf(connection.id))[0]).toMatchObject({
        status: 'error',
        errorCode: 'PROVIDER_ERROR',
      });
      expect(await bankRows(CHECKING)).toHaveLength(1);
    });

    it('a failure in the middle of the fetch (the second account) writes nothing at all', async () => {
      world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankAccount(), buildTestBankCard()]);
      world.provider.transactions.set(CHECKING, [buildTestBankTransaction({ id: 'a1' })]);
      world.provider.fail('listInvoices', 'unavailable');

      const connection = await world.connect();

      expect(connection.lastRun).toMatchObject({ status: 'error', errorCode: 'PROVIDER_ERROR' });
      expect(await world.accountsTable()).toEqual([]);
      expect(await world.database.db.selectFrom('transactions').selectAll().execute()).toEqual([]);
      expect(connection.history.status).toBe('pending');
    });

    it('keys that stopped being valid end the run as an error and never leak into the answers', async () => {
      const connection = await world.connect();
      world.provider.validCredentials = { clientId: 'other', clientSecret: 'other-secret' };
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      expect((await world.runsOf(connection.id))[0]).toMatchObject({
        status: 'error',
        errorCode: 'PROVIDER_ERROR',
      });
    });

    it('while the Pluggy is still reading the bank (updating), a round that someone waits for looks again until it is ready', async () => {
      world.provider.items.set(
        SYNC_TEST_ITEM_ID,
        buildTestItem({ state: 'updating', lastUpdatedAt: null }),
      );
      let looks = 0;
      const original = world.provider.getItem.bind(world.provider);
      world.provider.getItem = async (credentials, itemId) => {
        looks += 1;
        if (looks === 3) {
          world.provider.items.set(SYNC_TEST_ITEM_ID, buildTestItem());
        }

        return original(credentials, itemId);
      };
      world.provider.transactions.set(CHECKING, [buildTestBankTransaction({ id: 'a1' })]);

      const connection = await world.connect();

      expect((await world.runsOf(connection.id))[0]).toMatchObject({
        status: 'success',
        createdCount: 1,
      });
      expect(world.waits.length).toBeGreaterThan(0);
    });

    it('a scheduled round does not wait for a bank that is updating: nothing is imported, the run closes `success` and the connection is left as it was', async () => {
      const connection = await world.connect();
      world.provider.items.set(SYNC_TEST_ITEM_ID, buildTestItem({ state: 'updating' }));
      world.provider.calls.length = 0;
      world.waits.length = 0;
      world.moveTo('2026-11-09T18:00:00.000Z');

      const { ranCount } = await world.parts.runDueConnections.run();

      expect(ranCount).toBe(1);
      expect(world.waits).toEqual([]);
      expect(world.provider.calls).toEqual([`getItem:${SYNC_TEST_ITEM_ID}`]);
      expect(await world.connectionsOf()).toMatchObject([
        { status: 'active', errorCode: null, lastBankUpdateAt: '2026-11-09T13:00:00.000Z' },
      ]);
      expect((await world.runsOf(connection.id))[0]).toMatchObject({
        trigger: 'schedule',
        status: 'success',
        errorCode: null,
        createdCount: 0,
      });
    });

    it('a first connection whose bank is still being read after the wait closes its run `success` with nothing imported, and the next scheduled round, with the bank ready, imports it', async () => {
      world.provider.items.set(
        SYNC_TEST_ITEM_ID,
        buildTestItem({ state: 'updating', lastUpdatedAt: null }),
      );
      world.provider.transactions.set(CHECKING, [buildTestBankTransaction({ id: 'a1' })]);

      const connection = await world.connect();

      expect(world.waits.length).toBeGreaterThan(0);
      expect(connection.lastRun).toMatchObject({ status: 'success', errorCode: null });
      expect(connection).toMatchObject({ status: 'active', errorCode: null });
      expect(await world.accountsTable()).toEqual([]);

      world.provider.items.set(SYNC_TEST_ITEM_ID, buildTestItem());
      world.moveTo('2026-11-09T18:00:00.000Z');
      expect((await world.parts.runDueConnections.run()).ranCount).toBe(1);

      expect((await world.connectionsOf())[0]?.history.status).toBe('done');
      expect(await bankRows(CHECKING)).toHaveLength(1);
    });

    it('a history that was waiting (first round failed) is done by the round that works', async () => {
      world.provider.fail('listAccounts', 'unavailable');
      const connection = await world.connect();
      expect(connection.history.status).toBe('pending');
      world.provider.recover('listAccounts');
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      expect((await world.connectionsOf())[0]?.history.status).toBe('done');
    });

    it('keeps only the last 200 runs of the connection', async () => {
      const connection = await world.connect();
      const rows = Array.from({ length: 205 }, (_unused, index) => ({
        id: `019a0000-0000-7000-8000-${String(index).padStart(12, '0')}`,
        connection_id: connection.id,
        trigger: 'schedule' as const,
        started_at: new Date(
          Date.parse('2026-10-01T00:00:00.000Z') + index * 3_600_000,
        ).toISOString(),
        finished_at: '2026-10-01T00:00:01.000Z',
        status: 'success' as const,
        error_code: null,
        created_count: 0,
        updated_count: 0,
        removed_count: 0,
      }));
      await world.database.db.insertInto('sync_runs').values(rows).execute();
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      const left = await world.database.db.selectFrom('sync_runs').select('id').execute();
      expect(left).toHaveLength(200);
    });

    it('nothing the Pluggy or the keys said reaches the answers of the API', async () => {
      world.provider.fail('listTransactions', 'credentials_invalid');
      const connection = await world.connect();
      const body = JSON.stringify([
        await (await world.send('GET', '/sync/connections')).json(),
        await (await world.send('GET', `/sync/connections/${connection.id}/runs`)).json(),
        await (await world.send('GET', '/sync/settings')).json(),
      ]);

      expect(body).not.toContain('client-secret-test');
      expect(body).not.toContain('pluggy-account');
    });
  });
});
