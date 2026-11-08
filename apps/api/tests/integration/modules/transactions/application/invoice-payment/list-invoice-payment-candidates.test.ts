import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ListInvoicePaymentCandidatesQuery } from '#/modules/transactions/application/invoice-payment/list-invoice-payment-candidates.query.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

const REMOVED_AT = '2026-11-05T00:00:00.000Z';

// The raw material of "Pagamento encontrado": the debits of own accounts and the credits of the
// card that the import detectors marked as invoice payment.
describe('ListInvoicePaymentCandidatesQuery', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let query: ListInvoicePaymentCandidatesQuery;
  let card: string;
  let checking: string;

  beforeEach(async () => {
    database = await createTestDatabase();
    query = new ListInvoicePaymentCandidatesQuery(database.db);
    card = await insertTestCreditCard(database.db);
    checking = await insertTestAccount(database.db, { name: 'Nubank' });
  });

  afterEach(async () => {
    await database.destroy();
  });

  const debit = (overrides: Parameters<typeof insertTestTransaction>[2] = {}) =>
    insertTestTransaction(database.db, checking, {
      nature: 'invoice_payment',
      nature_set_by: 'system',
      method: 'pix',
      amount_cents: -50000,
      occurred_on: '2026-11-15',
      description: 'PAGAMENTO FATURA',
      ...overrides,
    });

  const credit = (overrides: Parameters<typeof insertTestTransaction>[2] = {}) =>
    insertTestTransaction(database.db, card, {
      nature: 'invoice_payment',
      nature_set_by: 'system',
      method: 'credit',
      invoice_month: '2026-11',
      amount_cents: 50000,
      occurred_on: '2026-11-15',
      description: 'PAGAMENTO RECEBIDO',
      ...overrides,
    });

  const candidates = (from = '2026-11-10', to = '2026-11-20') =>
    query.candidatesFor({ cardAccountId: card, from, to });

  const idsOf = (list: { transactionId: string }[]) =>
    list.map((item) => item.transactionId).sort();

  describe('debits', () => {
    it('answers a debit of another account that is an invoice payment, with the fields of the candidate', async () => {
      const id = await debit({ amount_cents: -73210, occurred_on: '2026-11-12' });

      const { debits, credits } = await candidates();

      expect(debits).toEqual([
        {
          transactionId: id,
          accountId: checking,
          amountCents: -73210,
          occurredOn: '2026-11-12',
          description: 'PAGAMENTO FATURA',
        },
      ]);
      expect(credits).toEqual([]);
    });

    it('takes the window from and to, both ends included', async () => {
      const before = await debit({ occurred_on: '2026-11-09' });
      const atFrom = await debit({ occurred_on: '2026-11-10' });
      const middle = await debit({ occurred_on: '2026-11-15' });
      const atTo = await debit({ occurred_on: '2026-11-20' });
      const after = await debit({ occurred_on: '2026-11-21' });

      const { debits } = await candidates();

      expect(idsOf(debits)).toEqual([atFrom, middle, atTo].sort());
      expect(idsOf(debits)).not.toContain(before);
      expect(idsOf(debits)).not.toContain(after);
    });

    it('wants a negative amount: an invoice payment that enters the account is not a debit', async () => {
      const outgoing = await debit();
      await debit({ amount_cents: 50000 });
      await debit({ amount_cents: 0 });

      const { debits } = await candidates();

      expect(idsOf(debits)).toEqual([outgoing]);
    });

    it('wants the nature invoice_payment', async () => {
      const payment = await debit();
      await debit({ nature: 'expense' });
      await debit({ nature: 'transfer' });
      await debit({ nature: 'income', amount_cents: -100 });

      const { debits } = await candidates();

      expect(idsOf(debits)).toEqual([payment]);
    });

    it('does not take the card itself, whatever its method', async () => {
      const own = await debit();
      await insertTestTransaction(database.db, card, {
        nature: 'invoice_payment',
        method: 'credit',
        amount_cents: -50000,
        occurred_on: '2026-11-15',
      });
      await insertTestTransaction(database.db, card, {
        nature: 'invoice_payment',
        method: 'pix',
        amount_cents: -50000,
        occurred_on: '2026-11-15',
      });

      const { debits } = await candidates();

      expect(idsOf(debits)).toEqual([own]);
    });

    it('does not take a charge on credit: on a card the method is always credit', async () => {
      const own = await debit({ method: 'debit' });
      await debit({ method: 'credit' });
      const otherCard = await insertTestCreditCard(database.db, { name: 'Outro cartão' });
      await insertTestTransaction(database.db, otherCard, {
        nature: 'invoice_payment',
        method: 'credit',
        amount_cents: -50000,
        occurred_on: '2026-11-15',
      });

      const { debits } = await candidates();

      expect(idsOf(debits)).toEqual([own]);
    });

    it('takes debits of every own account and of every method but credit', async () => {
      const savings = await insertTestAccount(database.db, { name: 'Poupança', type: 'savings' });
      const fromChecking = await debit({ method: 'pix' });
      const fromBoleto = await debit({ method: 'boleto' });
      const fromSavings = await insertTestTransaction(database.db, savings, {
        nature: 'invoice_payment',
        method: 'transfer',
        amount_cents: -50000,
        occurred_on: '2026-11-15',
      });

      const { debits } = await candidates();

      expect(idsOf(debits)).toEqual([fromChecking, fromBoleto, fromSavings].sort());
    });

    it('leaves out the ignored and what the bank removed without an edit', async () => {
      const kept = await debit();
      await debit({ ignored_at: '2026-11-16T10:00:00.000Z' });
      await debit({
        origin: 'bank',
        bank_description: 'PAGAMENTO FATURA',
        bank_amount_cents: -50000,
        bank_occurred_on: '2026-11-15',
        bank_status: 'posted',
        bank_removed_at: REMOVED_AT,
      });
      const editedAfterRemoval = await debit({
        origin: 'bank',
        description: 'Fatura Nubank',
        bank_description: 'PAGAMENTO FATURA',
        bank_amount_cents: -50000,
        bank_occurred_on: '2026-11-15',
        bank_status: 'posted',
        bank_removed_at: REMOVED_AT,
      });

      const { debits } = await candidates();

      expect(idsOf(debits)).toEqual([kept, editedAfterRemoval].sort());
    });

    it('crosses the end of the month in the window', async () => {
      const id = await debit({ occurred_on: '2026-12-01' });
      await debit({ occurred_on: '2026-11-29' });

      const { debits } = await candidates('2026-11-30', '2026-12-02');

      expect(idsOf(debits)).toEqual([id]);
    });
  });

  describe('credits', () => {
    it('answers a positive invoice payment on the card, with the fields of the candidate', async () => {
      const id = await credit({ amount_cents: 73210, occurred_on: '2026-11-12' });

      const { debits, credits } = await candidates();

      expect(credits).toEqual([
        {
          transactionId: id,
          accountId: card,
          amountCents: 73210,
          occurredOn: '2026-11-12',
          description: 'PAGAMENTO RECEBIDO',
        },
      ]);
      expect(debits).toEqual([]);
    });

    it('takes the window from - 3 days to to + 3 days, both ends included', async () => {
      const tooEarly = await credit({ occurred_on: '2026-11-06' });
      const atEarliest = await credit({ occurred_on: '2026-11-07' });
      const middle = await credit({ occurred_on: '2026-11-15' });
      const atLatest = await credit({ occurred_on: '2026-11-23' });
      const tooLate = await credit({ occurred_on: '2026-11-24' });

      const { credits } = await candidates();

      expect(idsOf(credits)).toEqual([atEarliest, middle, atLatest].sort());
      expect(idsOf(credits)).not.toContain(tooEarly);
      expect(idsOf(credits)).not.toContain(tooLate);
    });

    it('crosses the month and the year in the margin of 3 days', async () => {
      const early = await credit({ occurred_on: '2026-11-29' });
      await credit({ occurred_on: '2026-11-28' });
      const late = await credit({ occurred_on: '2027-01-02' });
      await credit({ occurred_on: '2027-01-03' });

      const { credits } = await candidates('2026-12-02', '2026-12-30');

      expect(idsOf(credits)).toEqual([early, late].sort());
    });

    it('wants a positive amount, the nature invoice_payment and the card itself', async () => {
      const mirror = await credit();
      await credit({ amount_cents: -50000 });
      await credit({ nature: 'expense' });
      await credit({ nature: 'transfer' });
      const otherCard = await insertTestCreditCard(database.db, { name: 'Outro cartão' });
      await insertTestTransaction(database.db, otherCard, {
        nature: 'invoice_payment',
        method: 'credit',
        amount_cents: 50000,
        occurred_on: '2026-11-15',
      });
      await insertTestTransaction(database.db, checking, {
        nature: 'invoice_payment',
        amount_cents: 50000,
        occurred_on: '2026-11-15',
      });

      const { credits } = await candidates();

      expect(idsOf(credits)).toEqual([mirror]);
    });

    it('leaves out the ignored and what the bank removed without an edit', async () => {
      const kept = await credit();
      await credit({ ignored_at: '2026-11-16T10:00:00.000Z' });
      await credit({
        origin: 'bank',
        bank_description: 'PAGAMENTO RECEBIDO',
        bank_amount_cents: 50000,
        bank_occurred_on: '2026-11-15',
        bank_status: 'posted',
        bank_removed_at: REMOVED_AT,
      });

      const { credits } = await candidates();

      expect(idsOf(credits)).toEqual([kept]);
    });
  });

  it('answers both lists together and empty when there is nothing', async () => {
    expect(await candidates()).toEqual({ debits: [], credits: [] });

    const out = await debit();
    const mirror = await credit();

    const { debits, credits } = await candidates();

    expect(idsOf(debits)).toEqual([out]);
    expect(idsOf(credits)).toEqual([mirror]);
  });

  it('works for the window of a single day', async () => {
    const out = await debit({ occurred_on: '2026-11-15' });
    await debit({ occurred_on: '2026-11-16' });
    const mirror = await credit({ occurred_on: '2026-11-18' });
    await credit({ occurred_on: '2026-11-19' });

    const { debits, credits } = await candidates('2026-11-15', '2026-11-15');

    expect(idsOf(debits)).toEqual([out]);
    expect(idsOf(credits)).toEqual([mirror]);
  });
});
