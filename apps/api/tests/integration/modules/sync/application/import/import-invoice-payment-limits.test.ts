import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createSyncTestWorld,
  SYNC_TEST_ITEM_ID,
} from '#tests/support/sync/connection/create-sync-test-world.util.ts';
import {
  buildTestBankAccount,
  buildTestBankCard,
  buildTestBankTransaction,
} from '#tests/support/sync/provider/build-test-bank-data.util.ts';

const CHECKING = 'pluggy-account-checking';
const CARD = 'pluggy-account-card';

// The detector of the payment of an invoice through the whole round (the app, the Pluggy double):
// a debit that "is worth the total of the invoice" is one payment, not every round number, and a
// credit that already has its debit is not taken again.
describe('the payment of an invoice never swallows a spending', () => {
  let world: Awaited<ReturnType<typeof createSyncTestWorld>>;

  beforeEach(async () => {
    world = await createSyncTestWorld();
    await world.saveKeys();
    world.provider.accounts.set(SYNC_TEST_ITEM_ID, [buildTestBankAccount(), buildTestBankCard()]);
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const natureOf = async (pluggyAccountId: string, description: string) => {
    const row = (await world.transactionsOf(await world.accountIdOf(pluggyAccountId))).find(
      (candidate) => candidate.description === description,
    );
    if (!row) throw new Error(`No transaction "${description}"`);

    return row.nature;
  };

  it('three debits that fit the total of the closed invoice: only the nearest to the due date pays it', async () => {
    // The card closes on the 5th and is due on the 12th: the invoice of October, R$ 500,00.
    world.provider.invoices.set(CARD, [{ id: 'b1', dueOn: '2026-10-12', totalCents: 50000 }]);
    world.provider.transactions.set(CARD, [
      buildTestBankTransaction({
        id: 'p1',
        description: 'Loja',
        amountCents: -50000,
        occurredOn: '2026-09-20',
        method: 'credit',
      }),
    ]);
    world.provider.transactions.set(CHECKING, [
      buildTestBankTransaction({
        id: 'd1',
        description: 'Pix aluguel',
        amountCents: -50000,
        occurredOn: '2026-10-08',
      }),
      buildTestBankTransaction({
        id: 'd2',
        description: 'Tarifa',
        amountCents: -49950,
        occurredOn: '2026-10-07',
      }),
      buildTestBankTransaction({
        id: 'd3',
        description: 'Pix fatura',
        amountCents: -50000,
        occurredOn: '2026-10-09',
      }),
    ]);

    await world.connect();

    expect(await natureOf(CHECKING, 'Pix fatura')).toBe('invoice_payment');
    expect(await natureOf(CHECKING, 'Pix aluguel')).toBe('expense');
    expect(await natureOf(CHECKING, 'Tarifa')).toBe('expense');
  });

  it('a debit of the same value that arrives in a later round does not pay an invoice that already has its payment', async () => {
    world.provider.invoices.set(CARD, [{ id: 'b1', dueOn: '2026-10-12', totalCents: 50000 }]);
    world.provider.transactions.set(CHECKING, [
      buildTestBankTransaction({
        id: 'd3',
        description: 'Pix fatura',
        amountCents: -50000,
        occurredOn: '2026-10-09',
      }),
    ]);
    const connection = await world.connect();
    expect(await natureOf(CHECKING, 'Pix fatura')).toBe('invoice_payment');

    world.provider.transactions.set(CHECKING, [
      buildTestBankTransaction({
        id: 'd3',
        description: 'Pix fatura',
        amountCents: -50000,
        occurredOn: '2026-10-09',
      }),
      buildTestBankTransaction({
        id: 'd1',
        description: 'Pix aluguel',
        amountCents: -50000,
        occurredOn: '2026-10-10',
      }),
    ]);
    world.moveTo('2026-11-09T18:00:00.000Z');
    await world.retry(connection.id);

    expect(await natureOf(CHECKING, 'Pix aluguel')).toBe('expense');
    expect(await natureOf(CHECKING, 'Pix fatura')).toBe('invoice_payment');
  });

  it('a credit on the card that already has its debit is not reused by a new debit of the same value', async () => {
    world.provider.transactions.set(CARD, [
      buildTestBankTransaction({
        id: 'card-credit',
        description: 'PAGAMENTO RECEBIDO',
        amountCents: 50000,
        occurredOn: '2026-10-13',
        method: 'credit',
      }),
    ]);
    world.provider.transactions.set(CHECKING, [
      buildTestBankTransaction({
        id: 'checking-debit',
        description: 'Pagamento fatura Nubank',
        amountCents: -50000,
        occurredOn: '2026-10-13',
      }),
    ]);
    const connection = await world.connect();
    expect(await natureOf(CARD, 'PAGAMENTO RECEBIDO')).toBe('invoice_payment');
    expect(await natureOf(CHECKING, 'Pagamento fatura Nubank')).toBe('invoice_payment');

    world.provider.transactions.set(CHECKING, [
      buildTestBankTransaction({
        id: 'checking-debit',
        description: 'Pagamento fatura Nubank',
        amountCents: -50000,
        occurredOn: '2026-10-13',
      }),
      buildTestBankTransaction({
        id: 'rent',
        description: 'Aluguel',
        amountCents: -50000,
        occurredOn: '2026-10-14',
      }),
    ]);
    world.moveTo('2026-11-09T18:00:00.000Z');
    await world.retry(connection.id);

    expect(await natureOf(CHECKING, 'Aluguel')).toBe('expense');
    expect(await natureOf(CARD, 'PAGAMENTO RECEBIDO')).toBe('invoice_payment');
  });

  it('the debit that arrives after a credit that was alone still pairs with it (what was not settled is still offered)', async () => {
    world.provider.transactions.set(CARD, [
      buildTestBankTransaction({
        id: 'card-credit',
        description: 'PAGAMENTO RECEBIDO',
        amountCents: 50000,
        occurredOn: '2026-10-13',
        method: 'credit',
      }),
    ]);
    const connection = await world.connect();
    world.provider.transactions.set(CHECKING, [
      buildTestBankTransaction({
        id: 'checking-debit',
        description: 'Pagamento fatura Nubank',
        amountCents: -50000,
        occurredOn: '2026-10-14',
      }),
    ]);
    world.moveTo('2026-11-09T18:00:00.000Z');
    await world.retry(connection.id);

    expect(await natureOf(CHECKING, 'Pagamento fatura Nubank')).toBe('invoice_payment');
  });
});
