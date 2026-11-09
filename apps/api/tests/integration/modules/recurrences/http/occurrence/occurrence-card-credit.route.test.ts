import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { occurrenceCandidateDtoSchema } from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  buildRecurrenceRequest,
  createRecurrenceTestWorld,
} from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

// A credit on the card (a refund) never settles an occurrence, whatever its nature: it only lowered
// the invoice, the money did not come into an account. The purchases on the card still do (a
// subscription charged on the card settles its expense occurrence).
describe('a credit on the card and the occurrences', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  // A credit on the card that Lucas made an income (by the category), on the invoice of November.
  const cardCredit = (cents: number, on: string) =>
    insertTestIncome(world.database.db, world.card, {
      cents,
      on,
      description: 'ESTORNO',
      overrides: { method: 'credit', invoice_month: '2026-11', nature_set_by: 'user' },
    });

  const candidatesOf = async (occurrenceId: string | undefined) => {
    const response = await world.send('GET', `/occurrences/${occurrenceId}/candidates`);
    expect(response.status).toBe(200);

    return listResponseSchema(occurrenceCandidateDtoSchema).parse(await response.json()).items;
  };

  const expectError = async (response: Response, code: string) => {
    expect(response.status).toBe(422);
    expect(apiErrorSchema.parse(await response.json()).code).toBe(code);
  };

  it('is not a candidate of an income, and the credit of the account still is', async () => {
    const { occurrence } = await world.create({
      kind: 'income',
      name: 'Salário',
      expectedAmountCents: 3000,
      dateRule: { type: 'fixed_day', day: 15 },
    });
    await cardCredit(3000, '2026-10-15');
    const pix = await insertTestIncome(world.database.db, world.checking, {
      cents: 3000,
      on: '2026-10-15',
    });

    expect((await candidatesOf(occurrence?.id)).map((item) => item.transactionId)).toEqual([pix]);
  });

  it('is refused as the payment of an income occurrence, by id', async () => {
    const { occurrence } = await world.create({
      kind: 'income',
      name: 'Salário',
      expectedAmountCents: 3000,
      dateRule: { type: 'fixed_day', day: 15 },
    });
    const credit = await cardCredit(3000, '2026-10-15');

    await expectError(
      await world.send('POST', `/occurrences/${occurrence?.id}/payments`, {
        transactionId: credit,
      }),
      'OCCURRENCE_TRANSACTION_ON_CARD',
    );
  });

  it('is refused as the payment of an expense occurrence too (a refund as a debit of nature expense)', async () => {
    const { occurrence } = await world.create({ name: 'Academia' });
    const refund = await insertTestTransaction(world.database.db, world.card, {
      nature: 'expense',
      method: 'credit',
      invoice_month: '2026-11',
      amount_cents: 10990,
      occurred_on: '2026-10-10',
    });

    await expectError(
      await world.send('POST', `/occurrences/${occurrence?.id}/payments`, {
        transactionId: refund,
      }),
      'OCCURRENCE_TRANSACTION_ON_CARD',
    );
  });

  it('is refused as the transaction a new recurrence is born tied to', async () => {
    const credit = await cardCredit(3000, '2026-10-15');

    await expectError(
      await world.send(
        'POST',
        '/recurrences',
        buildRecurrenceRequest({
          kind: 'income',
          name: 'Cashback',
          expectedAmountCents: 3000,
          dateRule: { type: 'fixed_day', day: 15 },
          linkTransactionId: credit,
        }),
      ),
      'OCCURRENCE_TRANSACTION_ON_CARD',
    );
  });

  it('keeps the purchase on the card as a candidate and as a payment of an expense', async () => {
    const { occurrence } = await world.create({ name: 'Netflix', expectedAmountCents: 5590 });
    const purchase = await insertTestExpense(world.database.db, world.card, {
      cents: 5590,
      on: '2026-10-10',
      description: 'NETFLIX',
      overrides: { method: 'credit', invoice_month: '2026-11' },
    });

    expect((await candidatesOf(occurrence?.id)).map((item) => item.transactionId)).toEqual([
      purchase,
    ]);
    expect(
      (
        await world.send('POST', `/occurrences/${occurrence?.id}/payments`, {
          transactionId: purchase,
        })
      ).status,
    ).toBe(201);
  });
});
