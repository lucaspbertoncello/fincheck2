import {
  billCounterpartyDtoSchema,
  billDtoSchema,
  billPaymentCandidateDtoSchema,
} from '@fincheck/shared/bills/bill/bill.schema.ts';
import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { describe, expect, it } from 'vitest';

import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function bills(query = '') {
  return listResponseSchema(billDtoSchema).parse((await callApi('GET', `/bills${query}`)).json)
    .items;
}

describe('bills routes', () => {
  it('lists open bills first by due date, with the undated at the end', async () => {
    const items = await bills();
    expect(items.some((bill) => bill.status === 'settled')).toBe(false);
    expect(items.at(-1)?.dueOn ?? null).toBeNull();
    const dated = items.filter((bill) => bill.dueOn !== null).map((bill) => bill.dueOn ?? '');
    expect(dated).toEqual([...dated].sort());
    expect((await bills('?status=settled')).map((bill) => bill.description)).toEqual([
      'Seguro do celular',
    ]);
    expect(await bills('?kind=friend&direction=receivable')).toHaveLength(1);
  });

  it('covers the friend debts: Rafa partial, Júlia with origin and a Pix received', async () => {
    const items = await bills('?status=all');
    const rafa = items.find((bill) => bill.counterparty === 'Rafa');
    expect(rafa).toMatchObject({
      direction: 'payable',
      kind: 'friend',
      paidCents: 15_000,
      remainingCents: 27_000,
      status: 'partial',
    });
    const julia = items.find((bill) => bill.counterparty === 'Júlia');
    expect(julia).toMatchObject({
      direction: 'receivable',
      paidCents: 5800,
      remainingCents: 5800,
      status: 'partial',
    });
    expect(julia?.origin?.amountCents).toBe(11_600);
    expect(items.find((bill) => bill.description === 'Mensalidade do curso')?.status).toBe(
      'overdue',
    );
  });

  it('suggests names and Pix to link, and reads one bill', async () => {
    const names = listResponseSchema(billCounterpartyDtoSchema).parse(
      (await callApi('GET', '/bills/counterparties')).json,
    ).items;
    expect(names.map((item) => item.name)).toEqual(expect.arrayContaining(['Rafa', 'Júlia']));
    const candidates = listResponseSchema(billPaymentCandidateDtoSchema).parse(
      (await callApi('GET', '/bills/payment-candidates?direction=payable&counterparty=Cursofit'))
        .json,
    ).items;
    expect(candidates.every((item) => item.amountCents < 0)).toBe(true);
    expect(candidates[0]?.description).toBe('PIX CURSOFIT');

    const [first] = await bills();
    expect(billDtoSchema.parse((await callApi('GET', `/bills/${first?.id}`)).json).id).toBe(
      first?.id,
    );
    expect(
      listResponseSchema(billPaymentCandidateDtoSchema).parse(
        (await callApi('GET', `/bills/${first?.id}/payment-candidates`)).json,
      ).items.length,
    ).toBeLessThanOrEqual(30);
    expect((await callApi('GET', '/bills/0194f3a0-0000-7000-8000-999999999999')).status).toBe(404);
    expect((await callApi('GET', '/bills/payment-candidates')).status).toBe(400);
  });

  it('pays a bill in two steps with a hand-made payment, then undoes one', async () => {
    const ipva = (await bills()).find((bill) => bill.description.startsWith('IPVA'));
    const first = billDtoSchema.parse(
      (
        await callApi('POST', `/bills/${ipva?.id}/payments`, {
          amountCents: 10_000,
          paidOn: '2026-01-05',
        })
      ).json,
    );
    expect(first).toMatchObject({
      paidCents: 10_000,
      status: expect.stringMatching(/partial|overdue/) as string,
    });
    expect(
      (
        await callApi('POST', `/bills/${ipva?.id}/payments`, {
          amountCents: 999_999,
          paidOn: '2026-01-05',
        })
      ).status,
    ).toBe(422);
    const full = billDtoSchema.parse(
      (
        await callApi('POST', `/bills/${ipva?.id}/payments`, {
          amountCents: 28_000,
          paidOn: '2026-01-06',
        })
      ).json,
    );
    expect(full.status).toBe('settled');
    expect(
      (
        await callApi('POST', `/bills/${ipva?.id}/payments`, {
          amountCents: 1,
          paidOn: '2026-01-06',
        })
      ).status,
    ).toBe(422);
    expect(
      (await callApi('DELETE', `/bills/${ipva?.id}/payments/${first.payments[0]?.id}`)).status,
    ).toBe(204);
    expect((await bills('?status=all')).find((bill) => bill.id === ipva?.id)?.paidCents).toBe(
      28_000,
    );
  });

  it('ties the Pix of the course to its bill and makes it settled', async () => {
    const course = (await bills()).find((bill) => bill.description === 'Mensalidade do curso');
    const candidates = listResponseSchema(billPaymentCandidateDtoSchema).parse(
      (await callApi('GET', `/bills/${course?.id}/payment-candidates`)).json,
    ).items;
    const paid = billDtoSchema.parse(
      (
        await callApi('POST', `/bills/${course?.id}/payments`, {
          transactionId: candidates[0]?.transactionId,
        })
      ).json,
    );
    expect(paid.status).toBe('settled');
    expect(paid.payments[0]?.description).toBe('PIX CURSOFIT');
    expect(
      (
        await callApi('POST', `/bills/${course?.id}/payments`, {
          transactionId: candidates[0]?.transactionId,
        })
      ).status,
    ).toBe(422);
  });

  it('creates and deletes a friend debt that is owed to me, with the Pix of the friend not counted as income', async () => {
    const created = await callApi('POST', '/bills', {
      direction: 'receivable',
      kind: 'friend',
      counterparty: 'Bia',
      description: 'Gasolina',
      amountCents: 8000,
    });
    expect(created.status).toBe(201);
    const bill = billDtoSchema.parse(created.json);
    expect(bill).toMatchObject({ remainingCents: 8000, status: 'open' });
    expect(
      (
        await callApi('POST', '/bills', {
          direction: 'payable',
          kind: 'friend',
          description: 'Sem pessoa',
          amountCents: 100,
        })
      ).status,
    ).toBe(400);
    expect((await callApi('DELETE', `/bills/${bill.id}`)).status).toBe(204);
    expect((await callApi('GET', `/bills/${bill.id}`)).status).toBe(404);
  });
});
