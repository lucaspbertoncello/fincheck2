import { describe, expect, it } from 'vitest';

import { deletionImpactDtoSchema } from '#/accounts/deletion-impact/deletion-impact.schema.ts';

describe('deletionImpactDtoSchema', () => {
  const dto = {
    transactionCount: 142,
    installmentPlanCount: 0,
    invoiceCount: 0,
    ruleCount: 1,
    isPluggy: true,
    returnsOnNextSync: true,
  };

  it('has counts and the two flags', () => {
    expect(deletionImpactDtoSchema.safeParse(dto).success).toBe(true);
  });

  it('refuses a negative count', () => {
    expect(deletionImpactDtoSchema.safeParse({ ...dto, transactionCount: -1 }).success).toBe(false);
  });
});
