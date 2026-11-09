import { accountDtoSchema } from '@fincheck/shared/accounts/account/account.schema.ts';
import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { transactionDtoSchema } from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function accounts() {
  return listResponseSchema(accountDtoSchema).parse((await callApi('GET', '/accounts')).json).items;
}

async function createManual(
  accountId: string,
  type: 'expense' | 'income',
  amountCents: number,
  description = 'Perna de teste',
): Promise<Transaction.Dto> {
  const answer = await callApi('POST', '/transactions', {
    type,
    accountId,
    method: 'pix',
    description,
    amountCents,
    occurredOn: TODAY,
  });

  return transactionDtoSchema.parse(answer.json);
}

// Two legs of the same money on two different bank accounts.
async function makeLegs() {
  const [first, second] = (await accounts()).filter((account) => account.type !== 'credit_card');
  const out = await createManual(first?.id ?? '', 'expense', 50_000);
  const into = await createManual(second?.id ?? '', 'income', 50_000);

  return { out, into };
}

async function patch(id: string, body: unknown) {
  return callApi('PATCH', `/transactions/${id}`, body);
}

async function readTransaction(id: string) {
  return transactionDtoSchema.parse((await callApi('GET', `/transactions/${id}`)).json);
}

describe('transaction: create without a category (mock vs api 7)', () => {
  it('has no category origin when there is no category', async () => {
    const [account] = await accounts();
    const tx = await createManual(account?.id ?? '', 'expense', 1000);

    expect(tx).toMatchObject({ categoryId: null, categorySource: null, isInReview: true });
  });
});

describe('transaction: nature and transfer legs (mock vs api 10, 11, 12)', () => {
  it('accepts the nature it already has even when the sign looks wrong (a card refund)', async () => {
    const [account] = await accounts();
    const tx = await createManual(account?.id ?? '', 'expense', 1000);
    const record = db.transactions.find((item) => item.id === tx.id);
    if (record) record.amountCents = 1000;

    const same = await patch(tx.id, { nature: 'expense' });
    expect(same.status).toBe(200);
    const other = await patch(tx.id, { nature: 'income' });
    expect(other.status).toBe(200);
    const mismatch = await patch(tx.id, { nature: 'expense', description: 'volta' });
    expect(mismatch.status).toBe(422);
    expect(apiErrorSchema.parse(mismatch.json).code).toBe('TRANSACTION_NATURE_SIGN_MISMATCH');
  });

  it('ties the two legs of a transfer, and leaving the transfer cuts both sides', async () => {
    const { out, into } = await makeLegs();

    const linked = transactionDtoSchema.parse(
      (await patch(out.id, { nature: 'transfer', transferCounterpartId: into.id })).json,
    );
    expect(linked).toMatchObject({ nature: 'transfer', transferCounterpartId: into.id });
    expect(await readTransaction(into.id)).toMatchObject({
      nature: 'transfer',
      transferCounterpartId: out.id,
      categoryId: null,
    });

    const left = await patch(out.id, { nature: 'expense' });
    expect(transactionDtoSchema.parse(left.json).transferCounterpartId).toBeNull();
    expect((await readTransaction(into.id)).transferCounterpartId).toBeNull();
  });

  it('refuses the same account, a value that is not the opposite and a leg that does not exist', async () => {
    const { out, into } = await makeLegs();
    const sameAccount = await createManual(out.accountId, 'income', 50_000);
    const otherValue = await createManual(into.accountId, 'income', 40_000);

    const answers = await Promise.all([
      patch(out.id, { nature: 'transfer', transferCounterpartId: sameAccount.id }),
      patch(out.id, { nature: 'transfer', transferCounterpartId: otherValue.id }),
      patch(out.id, {
        nature: 'transfer',
        transferCounterpartId: '0194f3a0-0000-7000-8000-999999999999',
      }),
      patch(out.id, { transferCounterpartId: into.id }),
    ]);

    expect(answers.map((answer) => answer.status)).toEqual([400, 400, 404, 400]);
    expect(apiErrorSchema.parse(answers[2]?.json).code).toBe('TRANSACTION_NOT_FOUND');
    expect((await readTransaction(out.id)).nature).toBe('expense');
  });

  it('lets go of the old leg when a new one is taken', async () => {
    const { out, into } = await makeLegs();
    const another = await createManual(into.accountId, 'income', 50_000);
    await patch(out.id, { nature: 'transfer', transferCounterpartId: into.id });

    await patch(out.id, { nature: 'transfer', transferCounterpartId: another.id });

    expect((await readTransaction(out.id)).transferCounterpartId).toBe(another.id);
    expect((await readTransaction(into.id)).transferCounterpartId).toBeNull();
  });

  it('deleting one leg sends the other back to expense or income by its sign, without a pair', async () => {
    const { out, into } = await makeLegs();
    await patch(out.id, { nature: 'transfer', transferCounterpartId: into.id });

    expect((await callApi('DELETE', `/transactions/${out.id}`)).status).toBe(204);

    expect(await readTransaction(into.id)).toMatchObject({
      nature: 'income',
      transferCounterpartId: null,
    });
  });

  it('the other leg follows an edited amount, with the opposite sign', async () => {
    const { out, into } = await makeLegs();
    await patch(out.id, { nature: 'transfer', transferCounterpartId: into.id });

    await patch(out.id, { amountCents: 60_000 });

    expect((await readTransaction(into.id)).amountCents).toBe(60_000);
  });
});

describe('transaction: nature locked by a link (mock vs api 81, 7-12, 7-14)', () => {
  it('refuses to change the nature of a transaction that settles an occurrence', async () => {
    const [account] = await accounts();
    const tx = await createManual(account?.id ?? '', 'income', 8000);
    const occurrence = db.occurrences[0] ?? ({} as (typeof db.occurrences)[number]);
    occurrence.payments.push({
      id: '0194f3a0-0000-7000-8000-000000000001',
      transactionId: tx.id,
      amountCents: 8000,
      occurredOn: TODAY,
      linkedBy: 'user',
    } as never);
    const { out } = await makeLegs();

    const changed = await patch(tx.id, { nature: 'transfer', transferCounterpartId: out.id });
    expect(changed.status).toBe(422);
    expect(apiErrorSchema.parse(changed.json).code).toBe('TRANSACTION_LINKED_TO_OCCURRENCE');

    // The same nature and any other edit are fine.
    expect((await patch(tx.id, { nature: 'income', description: 'Mesada' })).status).toBe(200);
  });

  it('refuses to take a transaction that settles an occurrence as the other leg of a transfer', async () => {
    const { out, into } = await makeLegs();
    const occurrence = db.occurrences[0] ?? ({} as (typeof db.occurrences)[number]);
    occurrence.payments.push({
      id: '0194f3a0-0000-7000-8000-000000000002',
      transactionId: into.id,
      amountCents: 50_000,
      occurredOn: TODAY,
      linkedBy: 'user',
    } as never);

    const answer = await patch(out.id, { nature: 'transfer', transferCounterpartId: into.id });

    expect(answer.status).toBe(422);
    expect(apiErrorSchema.parse(answer.json).code).toBe('TRANSACTION_LINKED_TO_OCCURRENCE');
    expect((await readTransaction(out.id)).nature).toBe('expense');
  });

  it('refuses to change the nature of a transaction that pays a bill, and keeps the other edits', async () => {
    const payment = db.bills.flatMap((bill) => bill.payments).find((item) => item.transactionId);
    const id = payment?.transactionId ?? '';
    const { into } = await makeLegs();

    const changed = await patch(id, { nature: 'transfer', transferCounterpartId: into.id });
    expect(changed.status).toBe(422);
    expect(apiErrorSchema.parse(changed.json).code).toBe('TRANSACTION_LINKED_TO_BILL');
    expect((await patch(id, { nature: 'expense', description: 'Pix para o Rafa' })).status).toBe(
      200,
    );
    expect((await patch(id, { description: 'Outro texto' })).status).toBe(200);
  });

  it('refuses to edit the amount of the origin of a debt (`lent`), and the other edits stand', async () => {
    const [account] = await accounts();
    const tx = await createManual(account?.id ?? '', 'expense', 30_000);
    const record = db.transactions.find((item) => item.id === tx.id);
    if (record) record.nature = 'lent';

    const answer = await patch(tx.id, { amountCents: 25_000 });
    expect(answer.status).toBe(422);
    expect(apiErrorSchema.parse(answer.json).code).toBe('TRANSACTION_LINKED_TO_BILL');
    expect((await patch(tx.id, { description: 'Emprestei' })).status).toBe(200);
  });
});
