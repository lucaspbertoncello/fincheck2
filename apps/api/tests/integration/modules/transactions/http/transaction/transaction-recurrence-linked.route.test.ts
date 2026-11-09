import { listTransactionsResponseSchema } from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { createRecurrenceTestWorld } from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';
import { insertTestExpense } from '#tests/support/transactions/transaction/insert-test-expense.util.ts';
import { insertTestIncome } from '#tests/support/transactions/transaction/insert-test-income.util.ts';

// `GET /transactions?recurrenceLinked=`: the transactions that add up in the cards of Recorrências.
describe('GET /transactions, the recurrence link filter', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const idsOf = async (query: string) => {
    const response = await world.send('GET', `/transactions?month=2026-10${query}`);
    expect(response.status).toBe(200);

    return listTransactionsResponseSchema
      .parse(await response.json())
      .items.map((item) => item.id)
      .sort();
  };

  const pay = async (occurrenceId: string | undefined, transactionId: string) => {
    const response = await world.send('POST', `/occurrences/${occurrenceId}/payments`, {
      transactionId,
    });
    expect(response.status).toBe(201);
  };

  it('returns only what pays an occurrence, and the opposite with false', async () => {
    const { occurrence } = await world.create({
      kind: 'income',
      name: 'Salário',
      expectedAmountCents: 120000,
      dateRule: { type: 'fixed_day', day: 15 },
    });
    const salary = await insertTestIncome(world.database.db, world.checking, {
      cents: 120000,
      on: '2026-10-15',
    });
    const loose = await insertTestIncome(world.database.db, world.checking, {
      cents: 5000,
      on: '2026-10-16',
    });
    await pay(occurrence?.id, salary);

    expect(await idsOf('&recurrenceLinked=true')).toEqual([salary]);
    expect(await idsOf('&recurrenceLinked=false')).toEqual([loose]);
    expect(await idsOf('')).toEqual([salary, loose].sort());
  });

  it('combines with the direction, and leaves out an ignored transaction', async () => {
    const income = await world.create({
      kind: 'income',
      name: 'Salário',
      expectedAmountCents: 120000,
      dateRule: { type: 'fixed_day', day: 15 },
    });
    const expense = await world.create({
      name: 'Academia',
      expectedAmountCents: 10990,
      dateRule: { type: 'fixed_day', day: 25 },
    });
    const salary = await insertTestIncome(world.database.db, world.checking, {
      cents: 120000,
      on: '2026-10-15',
    });
    const gym = await insertTestExpense(world.database.db, world.checking, {
      cents: 10990,
      on: '2026-10-20',
    });
    await pay(income.occurrence?.id, salary);
    await pay(expense.occurrence?.id, gym);

    expect(await idsOf('&recurrenceLinked=true')).toEqual([salary, gym].sort());
    expect(await idsOf('&recurrenceLinked=true&direction=in')).toEqual([salary]);
    expect(await idsOf('&recurrenceLinked=true&direction=out')).toEqual([gym]);

    // An ignored one pays nothing: it leaves the sum of the card, so it leaves the list too. It is
    // still linked, so it is not in the list of what has no link either.
    const ignored = await world.send('POST', `/transactions/${gym}/ignore`);
    expect(ignored.status).toBe(200);
    expect(await idsOf('&recurrenceLinked=true')).toEqual([salary]);
    expect(await idsOf('&recurrenceLinked=false')).toEqual([]);
  });

  it('combines with the account, the text and the category', async () => {
    const { occurrence } = await world.create({
      kind: 'income',
      name: 'Salário',
      expectedAmountCents: 120000,
      dateRule: { type: 'fixed_day', day: 15 },
    });
    const other = await insertTestAccount(world.database.db, { name: 'Outra conta' });
    const category = await insertTestCategory(world.database.db);
    const salary = await insertTestIncome(world.database.db, world.checking, {
      cents: 120000,
      on: '2026-10-15',
      description: 'Salario Empresa',
      overrides: { category_id: category, category_source: 'user' },
    });
    const elsewhere = await insertTestIncome(world.database.db, other, {
      cents: 30000,
      on: '2026-10-16',
      description: 'Salario Outro',
    });
    await pay(occurrence?.id, salary);
    await world.send('POST', `/occurrences/${occurrence?.id}/payments`, {
      transactionId: elsewhere,
    });

    expect(await idsOf('&recurrenceLinked=true')).toEqual([salary, elsewhere].sort());
    expect(await idsOf(`&recurrenceLinked=true&accountId=${world.checking}`)).toEqual([salary]);
    expect(await idsOf(`&recurrenceLinked=true&accountId=${other}`)).toEqual([elsewhere]);
    expect(await idsOf('&recurrenceLinked=true&search=empresa')).toEqual([salary]);
    expect(await idsOf(`&recurrenceLinked=true&categoryId=${category}`)).toEqual([salary]);
    expect(await idsOf(`&recurrenceLinked=false&accountId=${world.checking}`)).toEqual([]);
  });

  it('follows the month of the transaction, and pages without a month', async () => {
    const { occurrence } = await world.create({
      kind: 'income',
      name: 'Salário',
      expectedAmountCents: 120000,
      dateRule: { type: 'fixed_day', day: 15 },
    });
    // Paid in November a transaction that pays the occurrence of October: the list of November
    // has it, the one of October does not (the cards sum by the month of the occurrence).
    const late = await insertTestIncome(world.database.db, world.checking, {
      cents: 120000,
      on: '2026-11-02',
    });
    await pay(occurrence?.id, late);

    expect(await idsOf('&recurrenceLinked=true')).toEqual([]);
    const november = await world.send('GET', '/transactions?month=2026-11&recurrenceLinked=true');
    expect(
      listTransactionsResponseSchema.parse(await november.json()).items.map((item) => item.id),
    ).toEqual([late]);
    const paged = await world.send('GET', '/transactions?recurrenceLinked=true&limit=1');
    const page = listTransactionsResponseSchema.parse(await paged.json());
    expect(page.items.map((item) => item.id)).toEqual([late]);
    expect(page.nextCursor).toBeNull();
  });

  it('answers 400 for a value that is not a boolean', async () => {
    const response = await world.send('GET', '/transactions?month=2026-10&recurrenceLinked=yes');

    expect(response.status).toBe(400);
  });
});
