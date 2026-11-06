import { beforeEach, describe, expect, it } from 'vitest';

import { AccountPresenter } from '#/modules/accounts/application/account/account-presenter.service.ts';
import { ArchiveAccountUseCase } from '#/modules/accounts/application/account/archive-account.usecase.ts';
import { CreateAccountUseCase } from '#/modules/accounts/application/account/create-account.usecase.ts';
import { GetAccountUseCase } from '#/modules/accounts/application/account/get-account.usecase.ts';
import { ListAccountsUseCase } from '#/modules/accounts/application/account/list-accounts.usecase.ts';
import { UnarchiveAccountUseCase } from '#/modules/accounts/application/account/unarchive-account.usecase.ts';
import { UpdateAccountUseCase } from '#/modules/accounts/application/account/update-account.usecase.ts';
import { buildTestAccount } from '#tests/support/accounts/account/build-test-account.util.ts';
import { createInMemoryAccountRepository } from '#tests/support/accounts/account/create-in-memory-account-repository.util.ts';
import { createInMemoryLedger } from '#tests/support/accounts/account/create-in-memory-ledger.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';
import { createFakeUnitOfWork } from '#tests/support/shared/unit-of-work/create-fake-unit-of-work.util.ts';

// 2026-11-06 22:00 in Sao Paulo is already 2026-11-07 in UTC.
const clock = createFixedClock('2026-11-07T01:00:00.000Z');
const TODAY = '2026-11-06';

function setup(initial = [buildTestAccount()]) {
  const accounts = createInMemoryAccountRepository(initial);
  const ledger = createInMemoryLedger(TODAY);
  const connections = new Map();
  const presenter = new AccountPresenter(ledger.manualBalances, {
    async connectionsOf() {
      return connections;
    },
  });
  const unitOfWork = createFakeUnitOfWork();

  return { accounts, ledger, connections, presenter, unitOfWork };
}

describe('ListAccountsUseCase', () => {
  it('orders by type and then by name, ignoring case and accent', async () => {
    const { accounts, presenter } = setup([
      buildTestAccount({ type: 'credit_card', name: 'Roxinho' }),
      buildTestAccount({ type: 'wallet', name: 'Carteira' }),
      buildTestAccount({ type: 'savings', name: 'Poupança' }),
      buildTestAccount({ type: 'checking', name: 'zeta' }),
      buildTestAccount({ type: 'checking', name: 'Água' }),
      buildTestAccount({ type: 'checking', name: 'Banco' }),
    ]);

    const { items } = await new ListAccountsUseCase(accounts, presenter).execute({
      includeArchived: false,
    });

    expect(items.map((item) => item.name)).toEqual([
      'Água',
      'Banco',
      'zeta',
      'Poupança',
      'Carteira',
      'Roxinho',
    ]);
  });

  it('leaves the archived out unless asked', async () => {
    const { accounts, presenter } = setup([
      buildTestAccount({ name: 'Ativa' }),
      buildTestAccount({ name: 'Velha', archivedAt: '2026-10-01T00:00:00.000Z' }),
    ]);
    const list = new ListAccountsUseCase(accounts, presenter);

    expect((await list.execute({ includeArchived: false })).items).toHaveLength(1);
    expect((await list.execute({ includeArchived: true })).items).toHaveLength(2);
  });

  it('answers an empty list', async () => {
    const { accounts, presenter } = setup([]);

    expect(
      await new ListAccountsUseCase(accounts, presenter).execute({ includeArchived: true }),
    ).toEqual({
      items: [],
    });
  });
});

describe('AccountPresenter', () => {
  it('shows the bank balance of a Pluggy account with the time and the connection', async () => {
    const pluggy = buildTestAccount({ source: 'pluggy', bankBalanceCents: 123456 });
    const { accounts, presenter, connections } = setup([pluggy]);
    connections.set(pluggy.id, {
      connectionId: 'c1',
      status: 'active',
      errorCode: null,
      lastBankUpdateAt: null,
    });

    const dto = await new GetAccountUseCase(accounts, presenter).execute({ accountId: pluggy.id });

    expect(dto).toMatchObject({
      source: 'pluggy',
      balanceCents: 123456,
      balanceAt: '2026-11-06T12:00:00.000Z',
      connection: { connectionId: 'c1', status: 'active' },
    });
  });

  it('shows a Pluggy account the bank has not informed yet with a null balance', async () => {
    const pluggy = buildTestAccount({ source: 'pluggy' });
    const { accounts, presenter } = setup([pluggy]);

    const dto = await new GetAccountUseCase(accounts, presenter).execute({ accountId: pluggy.id });

    expect(dto).toMatchObject({ balanceCents: null, balanceAt: null, connection: null });
  });

  it('shows the used amount the bank informed on a Pluggy card', async () => {
    const card = buildTestAccount({ card: true, source: 'pluggy', bankBalanceCents: 45000 });
    const { accounts, presenter } = setup([card]);

    const dto = await new GetAccountUseCase(accounts, presenter).execute({ accountId: card.id });

    expect(dto.balanceCents).toBe(45000);
  });

  it('adds up the transactions of a manual account, without time nor connection', async () => {
    const manual = buildTestAccount();
    const { accounts, presenter, ledger } = setup([manual]);
    ledger.ledger.push(
      { accountId: manual.id, amountCents: 10000, occurredOn: '2026-11-01' },
      { accountId: manual.id, amountCents: -2500, occurredOn: '2026-11-06' },
      { accountId: manual.id, amountCents: -9999, occurredOn: '2026-11-07' },
    );

    const dto = await new GetAccountUseCase(accounts, presenter).execute({ accountId: manual.id });

    expect(dto).toMatchObject({ balanceCents: 7500, balanceAt: null, connection: null });
  });

  it('shows no balance on a manual card', async () => {
    const card = buildTestAccount({ card: true });
    const { accounts, presenter } = setup([card]);

    const dto = await new GetAccountUseCase(accounts, presenter).execute({ accountId: card.id });

    expect(dto).toMatchObject({
      balanceCents: null,
      creditCard: { brand: 'visa', last4: '1234', closingDay: 5, dueDay: 12, limitCents: null },
    });
  });
});

describe('GetAccountUseCase', () => {
  it('answers 404 for an unknown id and still answers for an archived account', async () => {
    const archived = buildTestAccount({ archivedAt: '2026-10-01T00:00:00.000Z' });
    const { accounts, presenter } = setup([archived]);
    const get = new GetAccountUseCase(accounts, presenter);

    expect((await get.execute({ accountId: archived.id })).archivedAt).toBe(
      '2026-10-01T00:00:00.000Z',
    );
    await expect(get.execute({ accountId: 'nope' })).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
    });
  });
});

describe('CreateAccountUseCase', () => {
  let context: ReturnType<typeof setup>;
  let create: CreateAccountUseCase;

  beforeEach(() => {
    context = setup([]);
    create = new CreateAccountUseCase(
      context.accounts,
      context.ledger.balanceAdjustments,
      context.presenter,
      context.unitOfWork,
      clock,
    );
  });

  it('creates a manual account, with no adjustment when there is no initial balance', async () => {
    const dto = await create.execute({
      type: 'checking',
      name: 'Nubank',
      institutionCode: 'nubank',
    });

    expect(dto).toMatchObject({
      source: 'manual',
      balanceCents: 0,
      connection: null,
      archivedAt: null,
      createdAt: '2026-11-07T01:00:00.000Z',
    });
    expect(context.accounts.stored.has(dto.id)).toBe(true);
    expect(context.ledger.adjustments).toEqual([]);
    expect(context.unitOfWork.runs).toBe(1);
  });

  it('records the initial balance as the first adjustment, dated today in Sao Paulo', async () => {
    const dto = await create.execute({
      type: 'checking',
      name: 'Nubank',
      institutionCode: 'nubank',
      initialBalanceCents: -5000,
    });

    expect(context.ledger.adjustments).toEqual([
      { accountId: dto.id, amountCents: -5000, occurredOn: TODAY, note: 'Saldo inicial' },
    ]);
    expect(dto.balanceCents).toBe(-5000);
  });

  it('creates a wallet on the wallet institution and a manual card without balance', async () => {
    const wallet = await create.execute({
      type: 'wallet',
      name: 'Carteira',
      initialBalanceCents: 12000,
    });
    const card = await create.execute({
      type: 'credit_card',
      name: 'Roxinho',
      institutionCode: 'nubank',
      creditCard: { brand: 'mastercard', closingDay: 3, dueDay: 10 },
    });

    expect(wallet).toMatchObject({ institutionCode: 'wallet', balanceCents: 12000 });
    expect(card).toMatchObject({ balanceCents: null, creditCard: { brand: 'mastercard' } });
    expect(context.ledger.adjustments).toHaveLength(1);
  });
});

describe('UpdateAccountUseCase', () => {
  it('edits and saves, and answers 404 for an unknown id', async () => {
    const account = buildTestAccount();
    const { accounts, presenter, unitOfWork } = setup([account]);
    const update = new UpdateAccountUseCase(accounts, presenter, unitOfWork, clock);

    const dto = await update.execute({ accountId: account.id, changes: { name: 'Nova' } });

    expect(dto.name).toBe('Nova');
    expect(accounts.stored.get(account.id)?.updatedAt).toBe('2026-11-07T01:00:00.000Z');
    await expect(
      update.execute({ accountId: 'nope', changes: { name: 'x' } }),
    ).rejects.toMatchObject({ code: 'ACCOUNT_NOT_FOUND' });
  });
});

describe('ArchiveAccountUseCase and UnarchiveAccountUseCase', () => {
  it('archives, refuses to archive twice, unarchives and refuses to unarchive twice', async () => {
    const account = buildTestAccount();
    const { accounts, presenter, unitOfWork } = setup([account]);
    const archive = new ArchiveAccountUseCase(accounts, presenter, unitOfWork, clock);
    const unarchive = new UnarchiveAccountUseCase(accounts, presenter, unitOfWork, clock);

    expect((await archive.execute({ accountId: account.id })).archivedAt).toBe(
      '2026-11-07T01:00:00.000Z',
    );
    await expect(archive.execute({ accountId: account.id })).rejects.toMatchObject({
      code: 'ACCOUNT_ALREADY_ARCHIVED',
    });
    expect((await unarchive.execute({ accountId: account.id })).archivedAt).toBe(null);
    await expect(unarchive.execute({ accountId: account.id })).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_ARCHIVED',
    });
    await expect(archive.execute({ accountId: 'nope' })).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
    });
    await expect(unarchive.execute({ accountId: 'nope' })).rejects.toMatchObject({
      code: 'ACCOUNT_NOT_FOUND',
    });
  });
});
