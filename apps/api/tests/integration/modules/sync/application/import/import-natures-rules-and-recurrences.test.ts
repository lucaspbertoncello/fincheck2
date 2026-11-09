import { invoiceDtoSchema } from '@fincheck/shared/invoices/invoice/invoice.schema.ts';
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
const SAVINGS = 'pluggy-account-savings';
const CARD = 'pluggy-account-card';

describe('what the round does to the nature, the category and the recurrences of the new transactions', () => {
  let world: Awaited<ReturnType<typeof createSyncTestWorld>>;

  beforeEach(async () => {
    world = await createSyncTestWorld();
    await world.saveKeys();
    world.provider.accounts.set(SYNC_TEST_ITEM_ID, [
      buildTestBankAccount(),
      buildTestBankAccount({ id: SAVINGS, name: 'Poupança', type: 'savings', numberHint: '9999' }),
      buildTestBankCard(),
    ]);
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const rowsOf = async (pluggyAccountId: string) =>
    world.transactionsOf(await world.accountIdOf(pluggyAccountId));
  const rowNamed = async (pluggyAccountId: string, description: string) => {
    const row = (await rowsOf(pluggyAccountId)).find(
      (candidate) => candidate.description === description,
    );
    if (!row) throw new Error(`No transaction "${description}"`);

    return row;
  };

  describe('payment of invoice', () => {
    const payment = (account: string = CARD) =>
      account === CARD
        ? buildTestBankTransaction({
            id: 'card-credit',
            description: 'PAGAMENTO RECEBIDO',
            amountCents: 30000,
            occurredOn: '2026-10-13',
            method: 'credit',
          })
        : buildTestBankTransaction({
            id: 'checking-debit',
            description: 'Pagamento fatura Nubank',
            amountCents: -30000,
            occurredOn: '2026-10-13',
          });

    it('a credit on the card and the debit on the account that mirrors it are both a payment of invoice, set by the system, outside spending and income', async () => {
      world.provider.transactions.set(CARD, [
        buildTestBankTransaction({
          id: 'p1',
          description: 'Loja',
          amountCents: -30000,
          occurredOn: '2026-09-20',
          method: 'credit',
        }),
        payment(CARD),
      ]);
      world.provider.transactions.set(CHECKING, [payment(CHECKING)]);

      await world.connect();

      expect(await rowNamed(CARD, 'PAGAMENTO RECEBIDO')).toMatchObject({
        nature: 'invoice_payment',
        nature_set_by: 'system',
        category_id: null,
      });
      expect(await rowNamed(CHECKING, 'Pagamento fatura Nubank')).toMatchObject({
        nature: 'invoice_payment',
        nature_set_by: 'system',
      });
      expect(await rowNamed(CARD, 'Loja')).toMatchObject({ nature: 'expense' });
    });

    it('the payment found of the invoice stops being null: the debit is the suggestion, presumed because the mirror exists', async () => {
      world.provider.transactions.set(CARD, [
        buildTestBankTransaction({
          id: 'p1',
          description: 'Loja',
          amountCents: -30000,
          occurredOn: '2026-09-20',
          method: 'credit',
        }),
        payment(CARD),
      ]);
      world.provider.transactions.set(CHECKING, [payment(CHECKING)]);

      await world.connect();

      const cardId = await world.accountIdOf(CARD);
      const response = await world.send('GET', `/cards/${cardId}/invoices/2026-10`);
      const invoice = invoiceDtoSchema.parse(await response.json());
      const debit = await rowNamed(CHECKING, 'Pagamento fatura Nubank');
      expect(invoice.paymentSuggestion).toMatchObject({
        transactionId: debit.id,
        amountCents: -30000,
        isPresumed: true,
      });
    });

    it('a credit on the card with no marker and no debit that mirrors it is a refund: an expense with a positive value, never income', async () => {
      world.provider.transactions.set(CARD, [
        buildTestBankTransaction({
          id: 'r1',
          description: 'ESTORNO AMAZON',
          amountCents: 4500,
          occurredOn: '2026-10-20',
          method: 'credit',
        }),
      ]);

      await world.connect();

      expect(await rowNamed(CARD, 'ESTORNO AMAZON')).toMatchObject({
        nature: 'expense',
        amount_cents: 4500,
      });
    });

    it('a debit that equals the total of a closed invoice, with no credit, is a payment', async () => {
      world.provider.invoices.set(CARD, [{ id: 'b1', dueOn: '2026-10-12', totalCents: 15000 }]);
      world.provider.transactions.set(CARD, [
        buildTestBankTransaction({
          id: 'p1',
          description: 'Loja',
          amountCents: -15000,
          occurredOn: '2026-09-20',
          method: 'credit',
        }),
      ]);
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({
          id: 'd1',
          description: 'Débito fatura',
          amountCents: -15000,
          occurredOn: '2026-10-14',
        }),
        buildTestBankTransaction({
          id: 'd2',
          description: 'Outro gasto',
          amountCents: -15000,
          occurredOn: '2026-09-01',
        }),
      ]);

      await world.connect();

      expect((await rowNamed(CHECKING, 'Débito fatura')).nature).toBe('invoice_payment');
      expect((await rowNamed(CHECKING, 'Outro gasto')).nature).toBe('expense');
    });

    it('the two sides do not have to come in the same round: the credit of today finds the debit of yesterday', async () => {
      world.provider.transactions.set(CHECKING, [payment(CHECKING)]);
      const connection = await world.connect();
      expect((await rowNamed(CHECKING, 'Pagamento fatura Nubank')).nature).toBe('expense');
      world.provider.transactions.set(CARD, [payment(CARD)]);
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      expect((await rowNamed(CHECKING, 'Pagamento fatura Nubank')).nature).toBe('invoice_payment');
      expect((await rowNamed(CARD, 'PAGAMENTO RECEBIDO')).nature).toBe('invoice_payment');
    });

    it('a nature Lucas chose is never undone: the debit he kept as an expense stays one', async () => {
      world.provider.transactions.set(CHECKING, [payment(CHECKING)]);
      const connection = await world.connect();
      const debit = await rowNamed(CHECKING, 'Pagamento fatura Nubank');
      await world.send('PATCH', `/transactions/${debit.id}`, { nature: 'expense' });
      world.provider.transactions.set(CARD, [payment(CARD)]);
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      expect(await rowNamed(CHECKING, 'Pagamento fatura Nubank')).toMatchObject({
        nature: 'expense',
        nature_set_by: 'user',
      });
    });

    it('what already pays something else (an occurrence) is not turned into a payment', async () => {
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({
          id: 'd1',
          description: 'Academia',
          amountCents: -30000,
          occurredOn: '2026-11-03',
        }),
      ]);
      const connection = await world.connect();
      const debit = await rowNamed(CHECKING, 'Academia');
      const created = await world.send('POST', '/recurrences', {
        kind: 'expense',
        name: 'Academia',
        expectedAmountCents: 30000,
        dateRule: { type: 'fixed_day', day: 3 },
        startsMonth: '2026-11',
        linkTransactionId: debit.id,
      });
      expect(created.status).toBe(201);
      world.provider.transactions.set(CARD, [
        buildTestBankTransaction({
          id: 'card-credit',
          description: 'PAGAMENTO RECEBIDO',
          amountCents: 30000,
          occurredOn: '2026-11-03',
          method: 'credit',
        }),
      ]);
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      expect((await rowNamed(CHECKING, 'Academia')).nature).toBe('expense');
      expect((await rowNamed(CARD, 'PAGAMENTO RECEBIDO')).nature).toBe('invoice_payment');
    });
  });

  describe('transfer between own accounts', () => {
    const legs = () => {
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({
          id: 'out',
          description: 'Para poupança',
          amountCents: -50000,
          occurredOn: '2026-11-03',
          method: 'transfer',
        }),
      ]);
      world.provider.transactions.set(SAVINGS, [
        buildTestBankTransaction({
          id: 'in',
          description: 'Da corrente',
          amountCents: 50000,
          occurredOn: '2026-11-04',
          method: 'transfer',
        }),
      ]);
    };

    it('two legs of opposite value in two accounts, up to 2 days apart, are a transfer, pointing at each other', async () => {
      legs();

      await world.connect();

      const out = await rowNamed(CHECKING, 'Para poupança');
      const incoming = await rowNamed(SAVINGS, 'Da corrente');
      expect(out).toMatchObject({
        nature: 'transfer',
        nature_set_by: 'system',
        transfer_counterpart_id: incoming.id,
      });
      expect(incoming).toMatchObject({ nature: 'transfer', transfer_counterpart_id: out.id });
    });

    it('legs 3 days apart are not a transfer', async () => {
      legs();
      world.provider.transactions.set(SAVINGS, [
        buildTestBankTransaction({
          id: 'in',
          description: 'Da corrente',
          amountCents: 50000,
          occurredOn: '2026-11-06',
          method: 'transfer',
        }),
      ]);

      await world.connect();

      expect((await rowNamed(CHECKING, 'Para poupança')).nature).toBe('expense');
      expect((await rowNamed(SAVINGS, 'Da corrente')).nature).toBe('income');
    });

    it('the pair of an account and a card is a payment of invoice, never a transfer', async () => {
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({
          id: 'out',
          description: 'Pix',
          amountCents: -50000,
          occurredOn: '2026-11-03',
        }),
      ]);
      world.provider.transactions.set(CARD, [
        buildTestBankTransaction({
          id: 'cr',
          description: 'CRÉDITO',
          amountCents: 50000,
          occurredOn: '2026-11-04',
          method: 'credit',
        }),
      ]);

      await world.connect();

      expect((await rowNamed(CHECKING, 'Pix')).nature).toBe('invoice_payment');
      expect((await rowNamed(CARD, 'CRÉDITO')).nature).toBe('invoice_payment');
    });

    it('a debit that pays an invoice is not also the leg of a transfer: the credit of the same value on the savings stays an income', async () => {
      world.provider.transactions.set(CARD, [
        buildTestBankTransaction({
          id: 'card-credit',
          description: 'PAGAMENTO RECEBIDO',
          amountCents: 30000,
          occurredOn: '2026-11-03',
          method: 'credit',
        }),
      ]);
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({
          id: 'checking-debit',
          description: 'Pagamento fatura Nubank',
          amountCents: -30000,
          occurredOn: '2026-11-03',
        }),
      ]);
      world.provider.transactions.set(SAVINGS, [
        buildTestBankTransaction({
          id: 'savings-credit',
          description: 'Pix recebido',
          amountCents: 30000,
          occurredOn: '2026-11-03',
        }),
      ]);

      await world.connect();

      const debit = await rowNamed(CHECKING, 'Pagamento fatura Nubank');
      expect(debit).toMatchObject({ nature: 'invoice_payment', transfer_counterpart_id: null });
      expect(await rowNamed(SAVINGS, 'Pix recebido')).toMatchObject({
        nature: 'income',
        transfer_counterpart_id: null,
      });
    });

    it('a round again does not pair them twice nor change them (idempotency)', async () => {
      legs();
      const connection = await world.connect();
      const before = await rowsOf(CHECKING);
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      expect(await rowsOf(CHECKING)).toEqual(before);
    });
  });

  describe('rules of category', () => {
    it('apply to the new transactions with no category: category, source and rule are recorded', async () => {
      const categoryId = await world.categoryIdOf('expense');
      const rule = await world.send('POST', '/rules', {
        descriptionContains: 'MERCADO',
        categoryId,
      });
      expect(rule.status).toBe(201);
      const ruleId = ((await rule.json()) as { rule: { id: string } }).rule.id;
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1', description: 'Mercado Central', amountCents: -15990 }),
        buildTestBankTransaction({ id: 'a2', description: 'Padaria', amountCents: -990 }),
      ]);

      await world.connect();

      expect(await rowNamed(CHECKING, 'Mercado Central')).toMatchObject({
        category_id: categoryId,
        category_source: 'rule',
        category_rule_id: ruleId,
      });
      expect((await rowNamed(CHECKING, 'Padaria')).category_id).toBeNull();
    });

    it('a rule created later does not touch what was imported before (only the new ones), and a manual category stays', async () => {
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1', description: 'Mercado Central', amountCents: -15990 }),
      ]);
      const connection = await world.connect();
      const categoryId = await world.categoryIdOf('expense');
      await world.send('POST', '/rules', { descriptionContains: 'MERCADO', categoryId });
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1', description: 'Mercado Central', amountCents: -15990 }),
        buildTestBankTransaction({
          id: 'a2',
          description: 'Mercado Sul',
          amountCents: -500,
          occurredOn: '2026-11-08',
        }),
      ]);
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      expect((await rowNamed(CHECKING, 'Mercado Central')).category_id).toBeNull();
      expect((await rowNamed(CHECKING, 'Mercado Sul')).category_id).toBe(categoryId);
    });

    it('a rule of an income category does not categorize an expense, and the other way round', async () => {
      const incomeCategory = await world.categoryIdOf('income');
      await world.send('POST', '/rules', {
        descriptionContains: 'MERCADO',
        categoryId: incomeCategory,
      });
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'a1', description: 'Mercado Central', amountCents: -15990 }),
      ]);

      await world.connect();

      expect((await rowNamed(CHECKING, 'Mercado Central')).category_id).toBeNull();
    });

    it('never gives a category to what became a payment or a transfer', async () => {
      const categoryId = await world.categoryIdOf('expense');
      await world.send('POST', '/rules', { descriptionContains: 'PARA', categoryId });
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({
          id: 'out',
          description: 'Para poupança',
          amountCents: -50000,
          occurredOn: '2026-11-03',
          method: 'transfer',
        }),
      ]);
      world.provider.transactions.set(SAVINGS, [
        buildTestBankTransaction({
          id: 'in',
          description: 'Da corrente',
          amountCents: 50000,
          occurredOn: '2026-11-04',
          method: 'transfer',
        }),
      ]);

      await world.connect();

      expect(await rowNamed(CHECKING, 'Para poupança')).toMatchObject({
        nature: 'transfer',
        category_id: null,
      });
    });
  });

  describe('match with the occurrences of the recurrences', () => {
    const createRecurrence = async (body: Record<string, unknown>) => {
      const response = await world.send('POST', '/recurrences', {
        startsMonth: '2026-11',
        ...body,
      });
      expect(response.status).toBe(201);
    };
    const payments = () =>
      world.database.db.selectFrom('occurrence_payments').selectAll().execute();

    it('a new income that settles an occurrence is tied to it by the system (linkedBy = auto), and takes the category of the recurrence', async () => {
      const categoryId = await world.categoryIdOf('income');
      await createRecurrence({
        kind: 'income',
        name: 'Mesada',
        expectedAmountCents: 85000,
        matchText: 'EMPRESA',
        categoryId,
        dateRule: { type: 'fixed_day', day: 8 },
      });
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({
          id: 'in',
          description: 'Transferência recebida',
          amountCents: 85000,
          occurredOn: '2026-11-08',
          method: 'transfer',
          counterparty: 'Empresa SA',
        }),
      ]);

      await world.connect();

      const income = await rowNamed(CHECKING, 'Transferência recebida');
      expect(await payments()).toEqual([
        expect.objectContaining({
          transaction_id: income.id,
          amount_cents: 85000,
          linked_by: 'auto',
        }),
      ]);
      expect(income).toMatchObject({ category_id: categoryId, category_source: 'recurrence' });
    });

    it('a new expense of the exact value of an occurrence is tied to it; one of another value is not', async () => {
      await createRecurrence({
        kind: 'expense',
        name: 'Academia',
        expectedAmountCents: 10990,
        dateRule: { type: 'fixed_day', day: 10 },
      });
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({
          id: 'g1',
          description: 'Mensalidade',
          amountCents: -10990,
          occurredOn: '2026-11-09',
        }),
        buildTestBankTransaction({
          id: 'g2',
          description: 'Outro',
          amountCents: -3333,
          occurredOn: '2026-11-09',
        }),
      ]);

      await world.connect();

      const linked = await payments();
      expect(linked).toHaveLength(1);
      expect(linked[0]?.transaction_id).toBe((await rowNamed(CHECKING, 'Mensalidade')).id);
    });

    it('with no recurrence nothing is tied', async () => {
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({ id: 'g1', amountCents: -10990 }),
      ]);

      await world.connect();

      expect(await payments()).toEqual([]);
    });

    it('two occurrences that fit the same transaction are not tied by the system: it stays for Lucas, in the review queue', async () => {
      for (const name of ['Academia A', 'Academia B']) {
        await createRecurrence({
          kind: 'expense',
          name,
          expectedAmountCents: 10990,
          dateRule: { type: 'fixed_day', day: 10 },
        });
      }
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({
          id: 'g1',
          description: 'Mensalidade',
          amountCents: -10990,
          occurredOn: '2026-11-09',
        }),
      ]);

      await world.connect();

      expect(await payments()).toEqual([]);
    });

    it('a payment of invoice or a transfer pays no occurrence', async () => {
      await createRecurrence({
        kind: 'expense',
        name: 'Fatura',
        expectedAmountCents: 30000,
        dateRule: { type: 'fixed_day', day: 10 },
      });
      world.provider.transactions.set(CARD, [
        buildTestBankTransaction({
          id: 'cr',
          description: 'PAGAMENTO RECEBIDO',
          amountCents: 30000,
          occurredOn: '2026-11-09',
          method: 'credit',
        }),
      ]);
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({
          id: 'out',
          description: 'Pagamento fatura',
          amountCents: -30000,
          occurredOn: '2026-11-09',
        }),
      ]);

      await world.connect();

      expect(await payments()).toEqual([]);
    });

    it('the same round again does not tie again (idempotency)', async () => {
      await createRecurrence({
        kind: 'expense',
        name: 'Academia',
        expectedAmountCents: 10990,
        dateRule: { type: 'fixed_day', day: 10 },
      });
      world.provider.transactions.set(CHECKING, [
        buildTestBankTransaction({
          id: 'g1',
          description: 'Mensalidade',
          amountCents: -10990,
          occurredOn: '2026-11-09',
        }),
      ]);
      const connection = await world.connect();
      world.moveTo('2026-11-09T18:00:00.000Z');

      await world.retry(connection.id);

      expect(await payments()).toHaveLength(1);
    });
  });
});
