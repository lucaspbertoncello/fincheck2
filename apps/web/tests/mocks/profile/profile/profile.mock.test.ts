import { listResponseSchema } from '@fincheck/shared/common/list/list.schema.ts';
import { profileDtoSchema } from '@fincheck/shared/profile/profile/profile.schema.ts';
import {
  createRecurrenceResponseSchema,
  recurrenceDtoSchema,
  recurrenceListItemSchema,
} from '@fincheck/shared/recurrences/recurrence/recurrence.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { addMonths } from '#mocks/support/dates/add-months.util.ts';
import { CURRENT_MONTH, TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function profile() {
  return profileDtoSchema.parse((await callApi('GET', '/profile')).json);
}

describe('profile routes against the API', () => {
  it('breaks a tie of amount by the name without case or accent, then by the id', async () => {
    const [first, second] = db.recurrences.filter(
      (item) => item.kind === 'income' && !item.pausedAt && !item.archivedAt,
    );
    if (!first || !second) throw new Error('seed without two income sources');
    const [low, high] = first.id < second.id ? [first, second] : [second, first];
    // Same amount, names that differ only in case: the id decides, the lower one first.
    for (const item of db.recurrences) if (item.kind === 'income') item.expectedAmountCents = 1;
    low.expectedAmountCents = 999_999_900;
    high.expectedAmountCents = 999_999_900;
    low.name = 'Bolsa';
    high.name = 'bolsa';

    const names = (await profile()).income.sources.slice(0, 2).map((item) => item.recurrenceId);

    expect(names).toEqual([low.id, high.id]);
  });

  it('waits for the month a source starts in before giving its next day', async () => {
    const source = db.recurrences.find(
      (item) => item.kind === 'income' && !item.pausedAt && !item.archivedAt,
    );
    if (!source) throw new Error('seed without an income source');
    source.startsMonth = addMonths(CURRENT_MONTH, 2);

    const found = (await profile()).income.sources.find((item) => item.recurrenceId === source.id);

    expect(
      found?.nextExpectedOn === null || found!.nextExpectedOn.slice(0, 7) >= source.startsMonth,
    ).toBe(true);
  });

  it('cuts the initials to 3 after the capitals ("ß" becomes "SS")', async () => {
    const saved = await callApi('PUT', '/profile', { name: 'Maria', initials: 'ßßß' });

    expect(profileDtoSchema.parse(saved.json).initials).toBe('SSS');
  });
});

describe('profile routes', () => {
  it('reads a made-up profile with the income recurrences as sources', async () => {
    const dto = await profile();

    expect(dto).toMatchObject({ name: 'Davi Moreira', initials: 'DM' });
    expect(dto.income.sources.map((item) => item.name)).toEqual([
      'Lume Design (freela)',
      'Salário Alvorada, dia 15',
      'Salário Alvorada, 5º dia útil',
      'Mesada',
      'VR convertido',
    ]);
    expect(dto.income.monthlyExpectedCents).toBe(123_000 + 137_000 + 395_000 + 80_000 + 74_000);
    expect(dto.income.sources.map((item) => item.employmentRegime)).toEqual([
      'pj',
      'clt',
      'clt',
      'other',
      'other',
    ]);
  });

  it('gives the next day each source is expected, never in the past', async () => {
    const { sources } = (await profile()).income;

    for (const source of sources) {
      if (source.nextExpectedOn !== null) expect(source.nextExpectedOn >= TODAY).toBe(true);
    }
    expect(sources.find((item) => item.name === 'Mesada')?.nextExpectedOn).toBeNull();
  });

  it('saves the name and derives the initials when they are not sent', async () => {
    const saved = profileDtoSchema.parse(
      (await callApi('PUT', '/profile', { name: '  Ana Maria Souza ' })).json,
    );

    expect(saved).toMatchObject({ name: 'Ana Maria Souza', initials: 'AS' });
    expect((await profile()).name).toBe('Ana Maria Souza');
  });

  it('keeps initials typed by the user, in capitals', async () => {
    const saved = profileDtoSchema.parse(
      (await callApi('PUT', '/profile', { name: 'Davi Moreira', initials: 'dmo' })).json,
    );

    expect(saved.initials).toBe('DMO');
  });

  it('stores the avatar, keeps it when it is left out and clears it with null', async () => {
    expect((await profile()).avatarId).toBeNull();

    const chosen = profileDtoSchema.parse(
      (await callApi('PUT', '/profile', { name: 'Davi Moreira', avatarId: 'notionists-05' })).json,
    );
    expect(chosen.avatarId).toBe('notionists-05');

    await callApi('PUT', '/profile', { name: 'Davi M' });
    expect((await profile()).avatarId).toBe('notionists-05');

    await callApi('PUT', '/profile', { name: 'Davi M', avatarId: null });
    expect((await profile()).avatarId).toBeNull();
    expect((await callApi('PUT', '/profile', { name: 'Davi', avatarId: 'nope' })).status).toBe(400);
  });

  it('refuses an empty name and four letters of initials', async () => {
    expect((await callApi('PUT', '/profile', { name: ' ' })).status).toBe(400);
    expect((await callApi('PUT', '/profile', { name: 'Davi', initials: 'ABCD' })).status).toBe(400);
  });

  it('follows the recurrences: a new income appears, a paused one leaves, the sum moves', async () => {
    const created = createRecurrenceResponseSchema.parse(
      (
        await callApi('POST', '/recurrences', {
          kind: 'income',
          name: 'Consultoria Beta',
          expectedAmountCents: 200_000,
          employmentRegime: 'pj',
          dateRule: { type: 'fixed_day', day: 10 },
        })
      ).json,
    );
    const afterCreate = await profile();
    expect(
      afterCreate.income.sources.find((item) => item.name === 'Consultoria Beta'),
    ).toMatchObject({ employmentRegime: 'pj', expectedAmountCents: 200_000 });
    expect(afterCreate.income.monthlyExpectedCents).toBe(809_000 + 200_000);

    await callApi('POST', `/recurrences/${created.recurrence.id}/pause`);
    const afterPause = await profile();
    expect(afterPause.income.sources.some((item) => item.name === 'Consultoria Beta')).toBe(false);
    expect(afterPause.income.monthlyExpectedCents).toBe(809_000);
  });

  it('edits the regime through the recurrence, and only for income', async () => {
    const items = listResponseSchema(recurrenceListItemSchema).parse(
      (await callApi('GET', `/recurrences?month=${CURRENT_MONTH}`)).json,
    ).items;
    const mesada = items.find((item) => item.name === 'Mesada');
    const academia = items.find((item) => item.name === 'Academia');

    const patched = await callApi('PATCH', `/recurrences/${mesada?.id}`, {
      employmentRegime: 'clt',
    });
    expect(recurrenceDtoSchema.parse(patched.json).employmentRegime).toBe('clt');
    expect(
      (await profile()).income.sources.find((item) => item.name === 'Mesada')?.employmentRegime,
    ).toBe('clt');

    const cleared = await callApi('PATCH', `/recurrences/${mesada?.id}`, {
      employmentRegime: null,
    });
    expect(recurrenceDtoSchema.parse(cleared.json).employmentRegime).toBeNull();

    const refused = await callApi('PATCH', `/recurrences/${academia?.id}`, {
      employmentRegime: 'pj',
    });
    expect(refused.status).toBe(422);
    expect(refused.json).toMatchObject({ code: 'RECURRENCE_REGIME_ONLY_FOR_INCOME' });
  });
});
