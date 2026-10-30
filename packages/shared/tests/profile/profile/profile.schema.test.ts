import { describe, expect, it } from 'vitest';

import { profileDtoSchema, updateProfileRequestSchema } from '#/profile/profile/profile.schema.ts';

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
      income: { monthlyExpectedCents: 450_000, sources: [source] },
      updatedAt: '2026-10-30T15:00:00.000Z',
    });

    expect(dto.income.sources[0]?.dateRule.day).toBeNull();
  });

  it('refuses a regime outside CLT, PJ and other', () => {
    const wrong = { ...source, employmentRegime: 'mei' };

    expect(
      profileDtoSchema.safeParse({
        name: 'Davi',
        initials: 'D',
        income: { monthlyExpectedCents: 0, sources: [wrong] },
        updatedAt: '2026-10-30T15:00:00.000Z',
      }).success,
    ).toBe(false);
  });
});

describe('updateProfileRequestSchema', () => {
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
