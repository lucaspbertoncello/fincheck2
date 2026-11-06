import { describe, expect, it } from 'vitest';

import { GetBalanceHistoryUseCase } from '#/modules/accounts/application/account/get-balance-history.usecase.ts';
import { buildTestAccount } from '#tests/support/accounts/account/build-test-account.util.ts';
import { createInMemoryAccountRepository } from '#tests/support/accounts/account/create-in-memory-account-repository.util.ts';
import { createInMemoryLedger } from '#tests/support/accounts/account/create-in-memory-ledger.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';

// 2026-11-03 at night in Sao Paulo (02:30Z of the 4th): today is the 3rd.
const clock = createFixedClock('2026-11-04T02:30:00.000Z');

function setup(
  account = buildTestAccount(),
  entries: { amountCents: number; occurredOn: string }[] = [],
) {
  const ledger = createInMemoryLedger(
    '2026-11-03',
    entries.map((entry) => ({ accountId: account.id, ...entry })),
  );

  return {
    account,
    history: new GetBalanceHistoryUseCase(
      createInMemoryAccountRepository([account]),
      ledger.movements,
      clock,
    ),
  };
}

describe('GetBalanceHistoryUseCase', () => {
  it('manual account, current month: one point a day from day 1 to today', async () => {
    const { account, history } = setup(buildTestAccount(), [
      { amountCents: 50000, occurredOn: '2026-10-20' },
      { amountCents: -1500, occurredOn: '2026-11-02' },
    ]);

    const result = await history.execute({ accountId: account.id, month: '2026-11' });

    expect(result).toEqual({
      accountId: account.id,
      month: '2026-11',
      points: [
        { date: '2026-11-01', balanceCents: 50000 },
        { date: '2026-11-02', balanceCents: 48500 },
        { date: '2026-11-03', balanceCents: 48500 },
      ],
    });
  });

  it('manual account, past month: goes to the last day and ignores what came later', async () => {
    const { account, history } = setup(buildTestAccount(), [
      { amountCents: 1000, occurredOn: '2026-02-27' },
      { amountCents: 300, occurredOn: '2026-03-01' },
    ]);

    const result = await history.execute({ accountId: account.id, month: '2026-02' });

    expect(result.points).toHaveLength(28);
    expect(result.points[26]).toEqual({ date: '2026-02-27', balanceCents: 1000 });
    expect(result.points[27]).toEqual({ date: '2026-02-28', balanceCents: 1000 });
  });

  it('Pluggy account: today is the bank balance, the days before undo the movement', async () => {
    const pluggy = buildTestAccount({ source: 'pluggy', bankBalanceCents: 9000 });
    const { account, history } = setup(pluggy, [
      { amountCents: -1000, occurredOn: '2026-11-02' },
      { amountCents: 500, occurredOn: '2026-11-03' },
    ]);

    const result = await history.execute({ accountId: account.id, month: '2026-11' });

    expect(result.points).toEqual([
      { date: '2026-11-01', balanceCents: 9500 },
      { date: '2026-11-02', balanceCents: 8500 },
      { date: '2026-11-03', balanceCents: 9000 },
    ]);
  });

  it('refuses a month after the current one with a validation error', async () => {
    const { account, history } = setup();

    await expect(
      history.execute({ accountId: account.id, month: '2026-12' }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
  });

  it('refuses a card and a Pluggy account without bank balance', async () => {
    for (const account of [
      buildTestAccount({ card: true }),
      buildTestAccount({ source: 'pluggy' }),
    ]) {
      await expect(
        setup(account).history.execute({ accountId: account.id, month: '2026-11' }),
      ).rejects.toMatchObject({ code: 'ACCOUNT_HISTORY_NOT_AVAILABLE' });
    }
  });

  it('answers 404 for an unknown id', async () => {
    await expect(
      setup().history.execute({ accountId: 'nope', month: '2026-11' }),
    ).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
    });
  });
});
