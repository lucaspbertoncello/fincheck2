import { describe, expect, it, vi } from 'vitest';

import { DeleteAccountUseCase } from '#/modules/accounts/application/account/delete-account.usecase.ts';
import { GetDeletionImpactUseCase } from '#/modules/accounts/application/account/get-deletion-impact.usecase.ts';
import { buildTestAccount } from '#tests/support/accounts/account/build-test-account.util.ts';
import { createInMemoryAccountRepository } from '#tests/support/accounts/account/create-in-memory-account-repository.util.ts';
import { createFakeUnitOfWork } from '#tests/support/shared/unit-of-work/create-fake-unit-of-work.util.ts';

describe('GetDeletionImpactUseCase', () => {
  function setup(account = buildTestAccount({ card: true }), status?: 'active' | 'error') {
    const invoices = { countOf: vi.fn(async () => 7) };
    const impact = new GetDeletionImpactUseCase(
      createInMemoryAccountRepository([account]),
      { countsOf: async () => ({ transactionCount: 142, installmentPlanCount: 3 }) },
      invoices,
      { countOf: async () => 2 },
      {
        connectionsOf: async () =>
          status
            ? new Map([
                [
                  account.id,
                  { connectionId: 'c1', status, errorCode: null, lastBankUpdateAt: null },
                ],
              ])
            : new Map(),
      },
    );

    return { account, impact, invoices };
  }

  it('counts what a manual card takes with it', async () => {
    const { account, impact } = setup();

    expect(await impact.execute({ accountId: account.id })).toEqual({
      transactionCount: 142,
      installmentPlanCount: 3,
      invoiceCount: 7,
      ruleCount: 2,
      isPluggy: false,
      returnsOnNextSync: false,
    });
  });

  it('has no invoices nor installment plans outside a card, and does not ask for them', async () => {
    const { account, impact, invoices } = setup(buildTestAccount({ type: 'wallet' }));

    expect(await impact.execute({ accountId: account.id })).toMatchObject({
      transactionCount: 142,
      installmentPlanCount: 0,
      invoiceCount: 0,
    });
    expect(invoices.countOf).not.toHaveBeenCalled();
  });

  it('warns that a Pluggy account comes back only while its connection is active', async () => {
    const active = buildTestAccount({ source: 'pluggy', bankBalanceCents: 1 });
    const broken = buildTestAccount({ source: 'pluggy', bankBalanceCents: 1 });

    expect(await setup(active, 'active').impact.execute({ accountId: active.id })).toMatchObject({
      isPluggy: true,
      returnsOnNextSync: true,
    });
    expect(await setup(broken, 'error').impact.execute({ accountId: broken.id })).toMatchObject({
      isPluggy: true,
      returnsOnNextSync: false,
    });
  });

  it('answers 404 for an unknown id', async () => {
    await expect(setup().impact.execute({ accountId: 'nope' })).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
    });
  });
});

describe('DeleteAccountUseCase', () => {
  function setup(account = buildTestAccount({ card: true })) {
    const calls: string[] = [];
    const accounts = createInMemoryAccountRepository([account]);
    const originalDelete = accounts.delete.bind(accounts);
    accounts.delete = async (id) => {
      calls.push('account');
      await originalDelete(id);
    };
    const remove = new DeleteAccountUseCase(
      accounts,
      { execute: async () => void calls.push('invoices') },
      { execute: async () => void calls.push('transactions') },
      { execute: async () => void calls.push('rules') },
      createFakeUnitOfWork(),
    );

    return { account, accounts, calls, remove };
  }

  it('deletes invoices, transactions and rules of the owners before the account itself', async () => {
    const { account, accounts, calls, remove } = setup();

    await remove.execute({ accountId: account.id });

    expect(calls).toEqual(['invoices', 'transactions', 'rules', 'account']);
    expect(accounts.stored.size).toBe(0);
  });

  it('leaves the invoices out when the account is not a card', async () => {
    const { account, calls, remove } = setup(buildTestAccount());

    await remove.execute({ accountId: account.id });

    expect(calls).toEqual(['transactions', 'rules', 'account']);
  });

  it('answers 404 and deletes nothing for an unknown id', async () => {
    const { calls, remove } = setup();

    await expect(remove.execute({ accountId: 'nope' })).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
    });
    expect(calls).toEqual([]);
  });
});
