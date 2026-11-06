import { describe, expect, it } from 'vitest';

import {
  profileDtoSchema,
  profileHighlightsDtoSchema,
  updateProfileRequestSchema,
} from '#/profile/profile/profile.schema.ts';

const source = {
  recurrenceId: '0194f3a0-0000-7000-8000-000000000001',
  name: 'Salário Alvorada',
  counterparty: 'Alvorada Sistemas',
  employmentRegime: 'clt',
  expectedAmountCents: 450_000,
  amountMode: 'fixed',
  dateRule: { type: 'business_day', businessDayNumber: 5 },
  accountId: null,
  nextExpectedOn: '2026-11-06',
};

describe('profileDtoSchema', () => {
  it('reads the name, the initials and the income sources', () => {
    const dto = profileDtoSchema.parse({
      name: 'Davi Moreira',
      initials: 'DM',
      avatarId: 'notionists-03',
      income: { monthlyExpectedCents: 450_000, sources: [source] },
      updatedAt: '2026-10-30T15:00:00.000Z',
    });

    expect(dto.income.sources[0]?.dateRule.day).toBeNull();
    expect(dto.avatarId).toBe('notionists-03');
  });

  it('needs the avatar to be one of the 12 ids or null', () => {
    const base = {
      name: 'Davi',
      initials: 'D',
      income: { monthlyExpectedCents: 0, sources: [] },
      updatedAt: '2026-10-30T15:00:00.000Z',
    };

    expect(profileDtoSchema.safeParse({ ...base, avatarId: null }).success).toBe(true);
    expect(profileDtoSchema.safeParse({ ...base, avatarId: 'notionists-13' }).success).toBe(false);
    expect(profileDtoSchema.safeParse(base).success).toBe(false);
  });

  it('refuses a regime outside CLT, PJ and other', () => {
    const wrong = { ...source, employmentRegime: 'mei' };

    expect(
      profileDtoSchema.safeParse({
        name: 'Davi',
        initials: 'D',
        avatarId: null,
        income: { monthlyExpectedCents: 0, sources: [wrong] },
        updatedAt: '2026-10-30T15:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('updateProfileRequestSchema', () => {
  it('takes an avatar id, null (back to the initials) or nothing', () => {
    expect(
      updateProfileRequestSchema.parse({ name: 'Davi', avatarId: 'notionists-12' }).avatarId,
    ).toBe('notionists-12');
    expect(updateProfileRequestSchema.parse({ name: 'Davi', avatarId: null }).avatarId).toBeNull();
    expect(updateProfileRequestSchema.parse({ name: 'Davi' }).avatarId).toBeUndefined();
    expect(updateProfileRequestSchema.safeParse({ name: 'Davi', avatarId: 'x' }).success).toBe(
      false,
    );
  });

  it('trims the name and lets the initials be left out', () => {
    expect(updateProfileRequestSchema.parse({ name: '  Davi Moreira ' })).toEqual({
      name: 'Davi Moreira',
    });
  });

  it('accepts up to three letters as initials', () => {
    expect(updateProfileRequestSchema.safeParse({ name: 'Davi', initials: 'DMO' }).success).toBe(
      true,
    );
    expect(updateProfileRequestSchema.safeParse({ name: 'Davi', initials: 'DMOR' }).success).toBe(
      false,
    );
    expect(updateProfileRequestSchema.safeParse({ name: 'Davi', initials: 'D1' }).success).toBe(
      false,
    );
  });

  it('refuses an empty name', () => {
    expect(updateProfileRequestSchema.safeParse({ name: '   ' }).success).toBe(false);
  });
});

describe('profileHighlightsDtoSchema', () => {
  const pix = {
    amountCents: 120_000,
    counterparty: 'RAFAEL MOURA',
    occurredOn: '2026-03-12',
    transactionId: '0194f3a0-0000-7000-8000-000000000009',
  };
  const full = {
    largestPixSent: pix,
    largestPixReceived: { ...pix, counterparty: null },
    topCategory: {
      categoryId: '0194f3a0-0000-7000-8000-00000000000a',
      totalCents: 540_000,
      sharePercent: 31.4,
    },
    costliestMonth: { month: '2026-03', totalCents: 910_000 },
    costliestWeekday: { weekday: 6, averageCents: 18_500 },
    longestNoSpendStreak: { days: 4, from: '2026-05-02', to: '2026-05-05' },
  };

  it('reads the six curiosities, the Pix name being optional', () => {
    const dto = profileHighlightsDtoSchema.parse(full);

    expect(dto.largestPixReceived?.counterparty).toBeNull();
    expect(dto.costliestWeekday?.weekday).toBe(6);
  });

  it('accepts every curiosity as null (no data yet)', () => {
    const empty = Object.fromEntries(Object.keys(full).map((key) => [key, null]));

    expect(profileHighlightsDtoSchema.safeParse(empty).success).toBe(true);
  });

  it('refuses a Pix with sign, a weekday past Saturday and a share above 100', () => {
    expect(
      profileHighlightsDtoSchema.safeParse({
        ...full,
        largestPixSent: { ...pix, amountCents: -1 },
      }).success,
    ).toBe(false);
    expect(
      profileHighlightsDtoSchema.safeParse({
        ...full,
        costliestWeekday: { weekday: 7, averageCents: 100 },
      }).success,
    ).toBe(false);
    expect(
      profileHighlightsDtoSchema.safeParse({
        ...full,
        topCategory: { ...full.topCategory, sharePercent: 101 },
      }).success,
    ).toBe(false);
  });
});
