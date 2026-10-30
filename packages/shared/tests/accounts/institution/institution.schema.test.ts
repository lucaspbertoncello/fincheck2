import { describe, expect, it } from 'vitest';

import { INSTITUTION_CODES, INSTITUTIONS } from '#/accounts/institution/institution.constant.ts';
import { institutionCodeSchema } from '#/accounts/institution/institution.schema.ts';

describe('institutionCodeSchema', () => {
  it('accepts the ten banks, wallet and other', () => {
    for (const code of [...INSTITUTIONS.map((bank) => bank.code), 'wallet', 'other']) {
      expect(institutionCodeSchema.safeParse(code).success).toBe(true);
    }
  });

  it('refuses a bank that is not in the list', () => {
    expect(institutionCodeSchema.safeParse('sicredi').success).toBe(false);
  });

  it('keeps the constant and the codes in sync', () => {
    expect(INSTITUTION_CODES).toEqual([
      ...INSTITUTIONS.map((bank) => bank.code),
      'wallet',
      'other',
    ]);
  });
});
