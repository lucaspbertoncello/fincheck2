import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import {
  occurrenceCandidateDtoSchema,
  occurrenceDtoSchema,
} from '@fincheck/shared/recurrences/occurrence/occurrence.schema.ts';
import {
  createRecurrenceResponseSchema,
  previewRecurrenceResponseSchema,
  recurrenceDetailDtoSchema,
  recurrenceDtoSchema,
  recurrenceListItemSchema,
  recurrenceSummarySchema,
} from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { describe, expect, it } from 'vitest';

import { CURRENT_MONTH } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function recurrences() {
  return listResponseSchema(recurrenceListItemSchema).parse(
    (await callApi('GET', `/recurrences?month=${CURRENT_MONTH}`)).json,
  ).items;
}

async function occurrences(query = '') {
  return listResponseSchema(occurrenceDtoSchema).parse(
    (await callApi('GET', `/occurrences?month=${CURRENT_MONTH}${query}`)).json,
  ).items;
}

describe('recurrences routes (reads)', () => {
  it('lists income first and covers the real income cases', async () => {
    const items = await recurrences();
    expect(items.slice(0, 5).every((item) => item.kind === 'income')).toBe(true);
    const names = items.map((item) => item.name);
    expect(names).toEqual(
      expect.arrayContaining(['Mesada', 'VR convertido', 'Lume Design (freela)']),
    );
    expect(items.filter((item) => item.name.startsWith('Salário'))).toHaveLength(2);

    const mesada = items.find((item) => item.name === 'Mesada');
    expect(mesada).toMatchObject({ maxPayments: 2, matchText: 'JORGE A LIMA' });
    expect(mesada?.occurrence).toMatchObject({
      status: 'partial',
      receivedCents: 40_000,
      remainingCents: 40_000,
    });
    const freela = items.find((item) => item.name === 'Lume Design (freela)');
    expect(freela?.dateRule).toMatchObject({ type: 'around_day', day: 25, toleranceDays: 2 });
    expect(freela?.occurrence?.receivedCents).toBe(0);
    expect(items.find((item) => item.name === 'VR convertido')?.occurrence?.status).toBe(
      'confirmed',
    );
  });

  it('summarizes the month and agrees with the list', async () => {
    const summary = recurrenceSummarySchema.parse(
      (await callApi('GET', `/recurrences/summary?month=${CURRENT_MONTH}`)).json,
    );
    expect(summary.incomes.count).toBe(5);
    expect(summary.incomes.expectedCents).toBe(123_000 + 137_000 + 395_000 + 80_000 + 74_000);
    // 5 fixed expenses plus 3 subscriptions on the card (Spotify, Nuvem+, Treina Cursos).
    expect(summary.expenses.count).toBe(8);
    expect(summary.expenses.differentCount).toBeGreaterThanOrEqual(1);
    expect(summary.expenses.paidCount).toBeGreaterThanOrEqual(2);
  });

  it('serves the detail with history and a preview of the next occurrences', async () => {
    const [first] = await recurrences();
    const detail = recurrenceDetailDtoSchema.parse(
      (await callApi('GET', `/recurrences/${first?.id}`)).json,
    );
    expect(detail.history.length).toBeGreaterThanOrEqual(3);
    expect(detail.history.every((item) => item.month <= CURRENT_MONTH)).toBe(true);

    const preview = previewRecurrenceResponseSchema.parse(
      (await callApi('POST', '/recurrences/preview', { dateRule: { type: 'fixed_day', day: 15 } }))
        .json,
    );
    expect(preview.occurrences).toHaveLength(3);
    expect(
      (await callApi('POST', '/recurrences/preview', { dateRule: { type: 'around_day', day: 25 } }))
        .status,
    ).toBe(400);
    expect((await callApi('GET', '/recurrences/0194f3a0-0000-7000-8000-999999999999')).status).toBe(
      404,
    );
  });

  it('lists the occurrences, flags the late and the different value, and filters by attention', async () => {
    const all = await occurrences();
    const needing = await occurrences('&needsAttention=true');
    expect(needing.length).toBeGreaterThanOrEqual(1);
    expect(needing.every((item) => item.needsAttention)).toBe(true);
    expect(needing.length).toBeLessThan(all.length);
    expect(all.find((item) => item.recurrenceName === 'Internet')?.difference).toMatchObject({
      amountCents: 1000,
      decision: null,
    });
  });
});

describe('recurrences routes (changes)', () => {
  it('confirms the second mesada Pix by linking a transaction', async () => {
    const mesada = (await occurrences()).find((item) => item.recurrenceName === 'Mesada');
    const candidates = listResponseSchema(occurrenceCandidateDtoSchema).parse(
      (await callApi('GET', `/occurrences/${mesada?.id}/candidates`)).json,
    ).items;
    expect(candidates.every((item) => item.amountCents > 0)).toBe(true);

    // A new income that the user links by hand.
    const accounts = (await callApi('GET', '/accounts')).json as { items: { id: string }[] };
    const created = (
      await callApi('POST', '/transactions', {
        type: 'income',
        accountId: accounts.items[0]?.id,
        method: 'pix',
        description: 'PIX JORGE A LIMA',
        amountCents: 40_000,
        occurredOn: '2000-01-01',
      })
    ).json as { id: string };
    const linked = await callApi('POST', `/occurrences/${mesada?.id}/payments`, {
      transactionId: created.id,
    });
    expect(linked.status).toBe(201);
    expect(occurrenceDtoSchema.parse(linked.json)).toMatchObject({
      status: 'confirmed',
      receivedCents: 80_000,
      remainingCents: 0,
      difference: null,
    });
    expect(
      (await callApi('POST', `/occurrences/${mesada?.id}/payments`, { transactionId: created.id }))
        .status,
    ).toBe(409);

    const payment = occurrenceDtoSchema.parse(linked.json).payments.at(-1);
    expect(
      (await callApi('DELETE', `/occurrences/${mesada?.id}/payments/${payment?.id}`)).status,
    ).toBe(204);
    expect((await occurrences()).find((item) => item.id === mesada?.id)?.status).toBe('partial');
  });

  it('marks as received, skips and undoes both', async () => {
    const freela = (await occurrences()).find(
      (item) => item.recurrenceName === 'Lume Design (freela)',
    );
    const settled = occurrenceDtoSchema.parse(
      (await callApi('POST', `/occurrences/${freela?.id}/settle`)).json,
    );
    expect(settled).toMatchObject({
      status: 'confirmed',
      remainingCents: 0,
      needsAttention: false,
    });
    expect((await callApi('POST', `/occurrences/${freela?.id}/settle`)).status).toBe(409);
    expect(
      occurrenceDtoSchema.parse((await callApi('POST', `/occurrences/${freela?.id}/unsettle`)).json)
        .status,
    ).not.toBe('confirmed');

    const skipped = occurrenceDtoSchema.parse(
      (await callApi('POST', `/occurrences/${freela?.id}/skip`)).json,
    );
    expect(skipped.status).toBe('skipped');
    expect(
      occurrenceDtoSchema.parse((await callApi('POST', `/occurrences/${freela?.id}/unskip`)).json)
        .status,
    ).not.toBe('skipped');
  });

  it('answers the different value with update and moves the expected amount forward', async () => {
    const internet = (await occurrences()).find((item) => item.recurrenceName === 'Internet');
    const decided = occurrenceDtoSchema.parse(
      (await callApi('POST', `/occurrences/${internet?.id}/difference`, { decision: 'update' }))
        .json,
    );
    expect(decided.difference?.decision).toBe('updated');
    expect(decided.needsAttention).toBe(false);
    const recurrence = recurrenceDtoSchema.parse(
      (await callApi('GET', `/recurrences/${internet?.recurrenceId}`)).json,
    );
    expect(recurrence.expectedAmountCents).toBe(12_990);
    expect(
      (await callApi('POST', `/occurrences/${internet?.id}/difference`, { decision: 'keep' }))
        .status,
    ).toBe(200);
  });

  it('creates, edits, pauses, resumes and deletes a recurrence', async () => {
    const created = await callApi('POST', '/recurrences', {
      kind: 'expense',
      name: 'Seguro auto',
      expectedAmountCents: 30_000,
      dateRule: { type: 'fixed_day', day: 20 },
    });
    expect(created.status).toBe(201);
    const { recurrence, occurrence } = createRecurrenceResponseSchema.parse(created.json);
    expect(occurrence?.expectedAmountCents).toBe(30_000);

    const patched = recurrenceDtoSchema.parse(
      (
        await callApi('PATCH', `/recurrences/${recurrence.id}`, {
          name: 'Seguro do carro',
          applyFrom: 'current_month',
        })
      ).json,
    );
    expect(patched.name).toBe('Seguro do carro');
    expect(
      recurrenceDtoSchema.parse((await callApi('POST', `/recurrences/${recurrence.id}/pause`)).json)
        .pausedAt,
    ).not.toBeNull();
    expect((await callApi('POST', `/recurrences/${recurrence.id}/pause`)).status).toBe(409);
    expect(
      recurrenceDtoSchema.parse(
        (await callApi('POST', `/recurrences/${recurrence.id}/resume`)).json,
      ).pausedAt,
    ).toBeNull();
    expect((await callApi('DELETE', `/recurrences/${recurrence.id}`)).status).toBe(204);
    expect((await recurrences()).some((item) => item.id === recurrence.id)).toBe(false);
  });
});

describe('recurrences routes (weekend and holiday shift)', () => {
  const rule = (shift?: 'none' | 'before' | 'after') => ({
    type: 'fixed_day',
    day: 10,
    ...(shift ? { nonBusinessDayShift: shift } : {}),
  });

  it('answers none for the seeded fixed days and null for the other rules', async () => {
    const items = await recurrences();
    for (const item of items) {
      expect(item.dateRule.nonBusinessDayShift).toBe(
        item.dateRule.type === 'fixed_day' ? 'none' : null,
      );
    }
  });

  it('previews January 2027 on Monday 11/01 with "after" and Friday 08/01 with "before"', async () => {
    const preview = async (shift?: 'none' | 'before' | 'after') =>
      previewRecurrenceResponseSchema
        .parse((await callApi('POST', '/recurrences/preview', { dateRule: rule(shift) })).json)
        .occurrences.map((item) => item.expectedOn);

    expect(await preview('after')).toEqual(['2026-11-10', '2026-12-10', '2027-01-11']);
    expect(await preview('before')).toEqual(['2026-11-10', '2026-12-10', '2027-01-08']);
    expect(await preview()).toEqual(['2026-11-10', '2026-12-10', '2027-01-10']);
  });

  it('saves the shift on create and on edit, and answers none when it is missing', async () => {
    const created = createRecurrenceResponseSchema.parse(
      (
        await callApi('POST', '/recurrences', {
          kind: 'expense',
          name: 'Aluguel',
          expectedAmountCents: 100_000,
          dateRule: rule('after'),
        })
      ).json,
    ).recurrence;
    expect(created.dateRule.nonBusinessDayShift).toBe('after');

    const edited = recurrenceDtoSchema.parse(
      (await callApi('PATCH', `/recurrences/${created.id}`, { dateRule: rule('before') })).json,
    );
    expect(edited.dateRule.nonBusinessDayShift).toBe('before');

    const withoutShift = recurrenceDtoSchema.parse(
      (await callApi('PATCH', `/recurrences/${created.id}`, { dateRule: rule() })).json,
    );
    expect(withoutShift.dateRule.nonBusinessDayShift).toBe('none');

    const detail = recurrenceDetailDtoSchema.parse(
      (await callApi('GET', `/recurrences/${created.id}`)).json,
    );
    expect(detail.dateRule.nonBusinessDayShift).toBe('none');
  });

  it('refuses a shift on a rule that does not take one', async () => {
    const answer = await callApi('POST', '/recurrences/preview', {
      dateRule: { type: 'business_day', businessDayNumber: 5, nonBusinessDayShift: 'after' },
    });
    expect(answer.status).toBe(400);
  });
});
