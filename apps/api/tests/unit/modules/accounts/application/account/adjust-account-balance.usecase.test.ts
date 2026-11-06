import { describe, expect, it } from 'vitest';

import { AccountPresenter } from '#/modules/accounts/application/account/account-presenter.service.ts';
import { AdjustAccountBalanceUseCase } from '#/modules/accounts/application/account/adjust-account-balance.usecase.ts';
import { buildTestAccount } from '#tests/support/accounts/account/build-test-account.util.ts';
import { createInMemoryAccountRepository } from '#tests/support/accounts/account/create-in-memory-account-repository.util.ts';
import { createInMemoryLedger } from '#tests/support/accounts/account/create-in-memory-ledger.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { createFakeUnitOfWork } from '#tests/support/shared/unit-of-work/create-fake-unit-of-work.util.ts';

const TODAY = '2026-11-06';

function setup(account = buildTestAccount({ type: 'wallet' }), balanceCents = 12000) {
  const ledger = createInMemoryLedger(TODAY, [
    { accountId: account.id, amountCents: balanceCents, occurredOn: '2026-11-01' },
  ]);
  const presenter = new AccountPresenter(ledger.manualBalances, {
    async connectionsOf() {
      return new Map();
    },
  });
  const adjust = new AdjustAccountBalanceUseCase(
    createInMemoryAccountRepository([account]),
    ledger.manualBalances,
    ledger.balanceAdjustments,
    presenter,
    createFakeUnitOfWork(),
    createFixedClock('2026-11-06T15:00:00.000Z'),
  );

  return { account, ledger, adjust };
}

describe('AdjustAccountBalanceUseCase', () => {
  it('records the difference and shows the target balance (wallet at 120,00, target 95,00)', async () => {
    const { account, ledger, adjust } = setup();

    const result = await adjust.execute({ accountId: account.id, targetBalanceCents: 9500 });

    expect(result.adjustment.amountCents).toBe(-2500);
    expect(result.account.balanceCents).toBe(9500);
    expect(ledger.adjustments).toEqual([
      { accountId: account.id, amountCents: -2500, occurredOn: TODAY, note: null },
    ]);
    expect(result.adjustment.transactionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('accepts a past date, a note and a negative target', async () => {
    const { account, ledger, adjust } = setup();

    const result = await adjust.execute({
      accountId: account.id,
      targetBalanceCents: -300,
      occurredOn: '2026-11-02',
      note: 'contei de novo',
    });

    expect(result.adjustment.amountCents).toBe(-12300);
    expect(ledger.adjustments[0]).toMatchObject({
      occurredOn: '2026-11-02',
      note: 'contei de novo',
    });
  });

  it('refuses a future date with a validation error and writes nothing', async () => {
    const { account, ledger, adjust } = setup();

    await expect(
      adjust.execute({ accountId: account.id, targetBalanceCents: 1, occurredOn: '2026-11-07' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(ledger.adjustments).toEqual([]);
  });

  it('refuses a target equal to the current balance', async () => {
    const { account, adjust } = setup();

    await expect(
      adjust.execute({ accountId: account.id, targetBalanceCents: 12000 }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_BALANCE_UNCHANGED' });
  });

  it('refuses Pluggy and card accounts, then archived ones, and 404 for an unknown id', async () => {
    for (const account of [
      buildTestAccount({ source: 'pluggy', bankBalanceCents: 1 }),
      buildTestAccount({ card: true }),
    ]) {
      await expect(
        setup(account).adjust.execute({ accountId: account.id, targetBalanceCents: 5 }),
      ).rejects.toMatchObject({ code: 'ACCOUNT_BALANCE_NOT_ADJUSTABLE' });
    }
    const archived = buildTestAccount({ archivedAt: '2026-10-01T00:00:00.000Z' });
    await expect(
      setup(archived).adjust.execute({ accountId: archived.id, targetBalanceCents: 5 }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_ARCHIVED' });
    await expect(
      setup().adjust.execute({ accountId: 'nope', targetBalanceCents: 5 }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_NOT_FOUND' });
  });
});
