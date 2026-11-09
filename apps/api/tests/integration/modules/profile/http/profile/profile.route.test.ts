import { profileDtoSchema } from '@fincheck/shared/profile/profile/profile.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { createRecurrenceTestWorld } from '#tests/support/recurrences/recurrence/create-recurrence-test-world.util.ts';

// 08/11/2026 12:00 in São Paulo.
const NOW = '2026-11-08T15:00:00.000Z';
const WRONG_TOKEN = { [LOCAL_TOKEN_HEADER]: 'wrong' };

describe('profile routes', () => {
  let world: Awaited<ReturnType<typeof createRecurrenceTestWorld>>;

  beforeEach(async () => {
    world = await createRecurrenceTestWorld(NOW);
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const getProfile = async () => {
    const response = await world.send('GET', '/profile');
    expect(response.status).toBe(200);

    return profileDtoSchema.parse(await response.json());
  };

  const putProfile = async (body: unknown) => world.send('PUT', '/profile', body);

  const savedProfile = async (body: unknown) => {
    const response = await putProfile(body);
    expect(response.status).toBe(200);

    return profileDtoSchema.parse(await response.json());
  };

  describe('GET /profile', () => {
    it('needs the local token', async () => {
      await world.expectError(
        await world.send('GET', '/profile', undefined, WRONG_TOKEN),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });

    it('answers "Você" / "V" and no income on the first opening', async () => {
      expect(await getProfile()).toMatchObject({
        name: 'Você',
        initials: 'V',
        avatarId: null,
        income: { monthlyExpectedCents: 0, sources: [] },
      });
    });

    it('answers the same when no row was ever saved', async () => {
      await world.database.db.deleteFrom('profile').execute();

      expect(await getProfile()).toEqual({
        name: 'Você',
        initials: 'V',
        avatarId: null,
        income: { monthlyExpectedCents: 0, sources: [] },
        updatedAt: NOW,
      });
    });

    it('reads an avatar the list no longer knows as no avatar', async () => {
      await world.database.db.updateTable('profile').set({ avatar_id: 'notionists-99' }).execute();

      expect((await getProfile()).avatarId).toBeNull();
    });
  });

  describe('PUT /profile', () => {
    it('saves the name and derives the initials when they are left out', async () => {
      const saved = await savedProfile({ name: 'Davi Moreira' });

      expect(saved).toMatchObject({ name: 'Davi Moreira', initials: 'DM', updatedAt: NOW });
      expect(await getProfile()).toEqual(saved);
    });

    it('keeps the initials he typed, always in capitals', async () => {
      expect(await savedProfile({ name: 'Lucas Bertoncello', initials: 'lu' })).toMatchObject({
        name: 'Lucas Bertoncello',
        initials: 'LU',
      });
    });

    it('cuts initials that grow in capitals instead of failing', async () => {
      expect((await savedProfile({ name: 'Lucas', initials: 'ßßß' })).initials).toBe('SSS');
    });

    it('trims the name and the initials', async () => {
      expect(await savedProfile({ name: '  Lucas  ', initials: ' lb ' })).toMatchObject({
        name: 'Lucas',
        initials: 'LB',
      });
    });

    it('derives the initials again when a later save leaves them out', async () => {
      await savedProfile({ name: 'Lucas Bertoncello', initials: 'LU' });

      expect((await savedProfile({ name: 'Lucas Bertoncello' })).initials).toBe('LB');
    });

    it('sets the avatar, keeps it when left out and clears it with null', async () => {
      expect((await savedProfile({ name: 'Lucas', avatarId: 'notionists-03' })).avatarId).toBe(
        'notionists-03',
      );
      expect((await savedProfile({ name: 'Lucas' })).avatarId).toBe('notionists-03');
      expect((await getProfile()).avatarId).toBe('notionists-03');
      expect((await savedProfile({ name: 'Lucas', avatarId: null })).avatarId).toBeNull();
    });

    it('moves updatedAt to the save', async () => {
      const later = '2026-11-09T10:00:00.000Z';
      await savedProfile({ name: 'Lucas' });
      const response = await world.at(later)('PUT', '/profile', { name: 'Lucas B' });

      expect(profileDtoSchema.parse(await response.json()).updatedAt).toBe(later);
    });

    it('creates the record when none was saved', async () => {
      await world.database.db.deleteFrom('profile').execute();

      await savedProfile({ name: 'Lucas' });

      const rows = await world.database.db.selectFrom('profile').selectAll().execute();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: 1, name: 'Lucas', initials: 'L' });
    });

    it.each([
      ['an empty name', { name: '' }],
      ['a name of only spaces', { name: '   ' }],
      ['a name over 60 characters', { name: 'a'.repeat(61) }],
      ['no name', {}],
      ['initials with a number', { name: 'Lucas', initials: 'L1' }],
      ['initials over 3 letters', { name: 'Lucas', initials: 'LUCA' }],
      ['empty initials', { name: 'Lucas', initials: '' }],
      ['an avatar that is not in the list', { name: 'Lucas', avatarId: 'notionists-99' }],
    ])('refuses %s with VALIDATION_FAILED', async (_label, body) => {
      await world.expectError(await putProfile(body), 400, 'VALIDATION_FAILED');
      expect((await getProfile()).name).toBe('Você');
    });
  });

  describe('the income sources (BR-PRF-002)', () => {
    const income = (overrides: Record<string, unknown>) =>
      world.create({
        kind: 'income',
        employmentRegime: 'clt',
        counterparty: 'Alvorada Sistemas',
        ...overrides,
      });

    it('lists the active income recurrences, biggest first, with their sum', async () => {
      await income({
        name: 'Mesada',
        counterparty: 'Pai',
        employmentRegime: undefined,
        expectedAmountCents: 85000,
        dateRule: { type: 'any_day' },
      });
      await income({
        name: 'Salário Alvorada, dia 15',
        expectedAmountCents: 420000,
        dateRule: { type: 'fixed_day', day: 15 },
      });
      await income({
        name: 'Freela',
        employmentRegime: 'pj',
        counterparty: undefined,
        expectedAmountCents: 120000,
        dateRule: { type: 'business_day', businessDayNumber: 5 },
      });

      const profile = await getProfile();

      expect(profile.income.monthlyExpectedCents).toBe(625000);
      expect(profile.income.sources.map((source) => source.name)).toEqual([
        'Salário Alvorada, dia 15',
        'Freela',
        'Mesada',
      ]);
      expect(profile.income.sources[0]).toMatchObject({
        counterparty: 'Alvorada Sistemas',
        employmentRegime: 'clt',
        expectedAmountCents: 420000,
        amountMode: 'fixed',
        dateRule: { type: 'fixed_day', day: 15 },
        accountId: null,
        nextExpectedOn: '2026-11-15',
      });
    });

    it('gives the next expected day: this month if it is ahead, the next if it has passed, null without a day', async () => {
      await income({ name: 'Passou', dateRule: { type: 'fixed_day', day: 5 } });
      await income({ name: 'Hoje', dateRule: { type: 'fixed_day', day: 8 } });
      await income({ name: 'Útil', dateRule: { type: 'business_day', businessDayNumber: 5 } });
      await income({ name: 'Solta', dateRule: { type: 'any_day' } });

      const byName = new Map(
        (await getProfile()).income.sources.map((source) => [source.name, source.nextExpectedOn]),
      );

      expect(byName.get('Passou')).toBe('2026-12-05');
      expect(byName.get('Hoje')).toBe('2026-11-08');
      // The 5th business day of November is 09/11 (tomorrow).
      expect(byName.get('Útil')).toBe('2026-11-09');
      expect(byName.get('Solta')).toBeNull();
    });

    it('breaks a tie on the amount by the name without accent', async () => {
      for (const name of ['Bola', 'Árvore', 'Arara']) {
        await income({ name, expectedAmountCents: 1000, dateRule: { type: 'any_day' } });
      }

      expect((await getProfile()).income.sources.map((source) => source.name)).toEqual([
        'Arara',
        'Árvore',
        'Bola',
      ]);
    });

    it('counts a recurrence of two payments with its full amount once', async () => {
      await income({
        name: 'Mesada',
        expectedAmountCents: 85000,
        maxPayments: 2,
        dateRule: { type: 'any_day' },
      });

      expect((await getProfile()).income.monthlyExpectedCents).toBe(85000);
    });

    it('does not list an expense recurrence', async () => {
      await world.create({ name: 'Academia' });

      expect((await getProfile()).income).toEqual({ monthlyExpectedCents: 0, sources: [] });
    });

    it('drops a paused source and brings it back when resumed', async () => {
      const { recurrence } = await income({ name: 'Salário', expectedAmountCents: 400000 });

      await world.send('POST', `/recurrences/${recurrence.id}/pause`);
      expect((await getProfile()).income.sources).toEqual([]);

      await world.send('POST', `/recurrences/${recurrence.id}/resume`);
      expect((await getProfile()).income.monthlyExpectedCents).toBe(400000);
    });

    it('drops a deleted source', async () => {
      const { recurrence } = await income({ name: 'Salário' });

      expect((await world.send('DELETE', `/recurrences/${recurrence.id}`)).status).toBe(204);

      expect((await getProfile()).income.sources).toEqual([]);
    });

    it('follows an edit of the recurrence', async () => {
      const { recurrence } = await income({ name: 'Salário', expectedAmountCents: 400000 });

      const patch = await world.send('PATCH', `/recurrences/${recurrence.id}`, {
        expectedAmountCents: 450000,
        employmentRegime: 'pj',
      });
      expect(patch.status).toBe(200);

      expect((await getProfile()).income.sources[0]).toMatchObject({
        recurrenceId: recurrence.id,
        expectedAmountCents: 450000,
        employmentRegime: 'pj',
      });
    });

    it('answers the income in the PUT too, so the screen needs no other read', async () => {
      await income({ name: 'Salário', expectedAmountCents: 400000 });

      expect((await savedProfile({ name: 'Lucas' })).income.monthlyExpectedCents).toBe(400000);
    });
  });
});
