import { describe, expect, it } from 'vitest';

import { adjustBalanceRequestSchema } from '#/accounts/balance-adjustment/balance-adjustment.schema.ts';

describe('adjustBalanceRequestSchema', () => {
  it('accepts a negative target and an optional date and note', () => {
    expect(adjustBalanceRequestSchema.safeParse({ targetBalanceCents: -2500 }).success).toBe(true);
    expect(
      adjustBalanceRequestSchema.safeParse({
        targetBalanceCents: 9500,
        occurredOn: '2026-10-20',
        note: 'Contei de novo',
      }).success,
    ).toBe(true);
  });

  it('refuses fractional cents, a bad date and a long note', () => {
    expect(adjustBalanceRequestSchema.safeParse({ targetBalanceCents: 95.5 }).success).toBe(false);
    expect(
      adjustBalanceRequestSchema.safeParse({ targetBalanceCents: 1, occurredOn: '20/10/2026' })
        .success,
    ).toBe(false);
    expect(
      adjustBalanceRequestSchema.safeParse({ targetBalanceCents: 1, note: 'x'.repeat(201) })
        .success,
    ).toBe(false);
  });
});
