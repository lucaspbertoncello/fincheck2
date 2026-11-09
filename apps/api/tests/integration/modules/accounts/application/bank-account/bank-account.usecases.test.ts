import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ConvertAccountToManualUseCase } from '#/modules/accounts/application/bank-account/convert-account-to-manual.usecase.ts';
import { GetAccountSummariesQuery } from '#/modules/accounts/application/bank-account/get-account-summaries.query.ts';
import { ImportBankAccountUseCase } from '#/modules/accounts/application/bank-account/import-bank-account.usecase.ts';
import { ListBankAccountCandidatesQuery } from '#/modules/accounts/application/bank-account/list-bank-account-candidates.query.ts';
import { RefreshBankAccountUseCase } from '#/modules/accounts/application/bank-account/refresh-bank-account.usecase.ts';
import { AccountNotFoundError } from '#/modules/accounts/domain/account/account-not-found.error.ts';
import { KyselyAccountRepository } from '#/modules/accounts/infra/account/account.repository.ts';
import { KyselyUnitOfWork } from '#/database/unit-of-work/kysely-unit-of-work.service.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCreditCard } from '#tests/support/accounts/account/insert-test-credit-card.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';

const clock = createFixedClock('2026-11-09T15:00:00.000Z');

describe('the use cases of accounts that the sync calls', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let accounts: KyselyAccountRepository;
  let unitOfWork: KyselyUnitOfWork;

  beforeEach(async () => {
    database = await createTestDatabase();
    accounts = new KyselyAccountRepository(database.db);
    unitOfWork = new KyselyUnitOfWork(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  const row = (id: string) =>
    database.db.selectFrom('accounts').selectAll().where('id', '=', id).executeTakeFirstOrThrow();

  describe('ImportBankAccountUseCase', () => {
    it('creates a bank account with the balance of the bank, and a card with its data', async () => {
      const useCase = new ImportBankAccountUseCase(accounts, clock);

      const checking = await unitOfWork.run((executor) =>
        useCase.execute(
          {
            type: 'checking',
            name: 'Conta',
            institutionCode: 'nubank',
            institutionName: null,
            balanceCents: 5000,
            card: null,
          },
          executor,
        ),
      );
      const card = await unitOfWork.run((executor) =>
        useCase.execute(
          {
            type: 'credit_card',
            name: 'Cartão',
            institutionCode: 'other',
            institutionName: 'Sicredi',
            balanceCents: 100,
            card: { brand: 'elo', last4: '9999', closingDay: 3, dueDay: 10, limitCents: 20000 },
          },
          executor,
        ),
      );

      expect(await row(checking.accountId)).toMatchObject({
        source: 'pluggy',
        bank_balance_cents: 5000,
        bank_balance_at: '2026-11-09T15:00:00.000Z',
      });
      expect(await row(card.accountId)).toMatchObject({
        type: 'credit_card',
        institution_name: 'Sicredi',
      });
      expect(
        await database.db
          .selectFrom('credit_cards')
          .selectAll()
          .where('account_id', '=', card.accountId)
          .executeTakeFirst(),
      ).toMatchObject({
        brand: 'elo',
        last4: '9999',
        closing_day: 3,
        due_day: 10,
        limit_cents: 20000,
      });
    });

    it('is undone with the unit of work that fails', async () => {
      const useCase = new ImportBankAccountUseCase(accounts, clock);

      await expect(
        unitOfWork.run(async (executor) => {
          await useCase.execute(
            {
              type: 'checking',
              name: 'Conta',
              institutionCode: 'nubank',
              institutionName: null,
              balanceCents: null,
              card: null,
            },
            executor,
          );
          throw new Error('stop');
        }),
      ).rejects.toThrow('stop');

      expect(await database.db.selectFrom('accounts').selectAll().execute()).toEqual([]);
    });
  });

  describe('RefreshBankAccountUseCase', () => {
    it('records the balance and brings a manual account back to the bank', async () => {
      const id = await insertTestAccount(database.db);
      const useCase = new RefreshBankAccountUseCase(accounts, clock);

      const answer = await unitOfWork.run((executor) =>
        useCase.execute({ accountId: id, balanceCents: -300, card: null }, executor),
      );

      expect(answer).toEqual({ isImported: true, isCard: false });
      expect(await row(id)).toMatchObject({ source: 'pluggy', bank_balance_cents: -300 });
    });

    it('with no balance from the bank keeps the last one', async () => {
      const id = await insertTestAccount(database.db, {
        source: 'pluggy',
        bank_balance_cents: 900,
        bank_balance_at: '2026-11-01T00:00:00.000Z',
      });
      const useCase = new RefreshBankAccountUseCase(accounts, clock);

      await unitOfWork.run((executor) =>
        useCase.execute({ accountId: id, balanceCents: null, card: null }, executor),
      );

      expect(await row(id)).toMatchObject({
        bank_balance_cents: 900,
        bank_balance_at: '2026-11-01T00:00:00.000Z',
      });
    });

    it('an archived account is ignored: nothing is written and it says it was not imported', async () => {
      const id = await insertTestAccount(database.db, { archived_at: '2026-10-01T00:00:00.000Z' });
      const useCase = new RefreshBankAccountUseCase(accounts, clock);

      const answer = await unitOfWork.run((executor) =>
        useCase.execute({ accountId: id, balanceCents: 1, card: null }, executor),
      );

      expect(answer.isImported).toBe(false);
      expect(await row(id)).toMatchObject({ source: 'manual', bank_balance_cents: null });
    });

    it('a card only gets the final and the limit it did not have', async () => {
      const id = await insertTestCreditCard(database.db, { source: 'pluggy' });
      await database.db
        .updateTable('credit_cards')
        .set({ last4: null, limit_cents: null })
        .where('account_id', '=', id)
        .execute();
      const useCase = new RefreshBankAccountUseCase(accounts, clock);

      await unitOfWork.run((executor) =>
        useCase.execute(
          { accountId: id, balanceCents: 10, card: { last4: '7777', limitCents: 4000 } },
          executor,
        ),
      );
      await unitOfWork.run((executor) =>
        useCase.execute(
          { accountId: id, balanceCents: 10, card: { last4: '1111', limitCents: 1 } },
          executor,
        ),
      );

      expect(
        await database.db
          .selectFrom('credit_cards')
          .selectAll()
          .where('account_id', '=', id)
          .executeTakeFirst(),
      ).toMatchObject({ last4: '7777', limit_cents: 4000 });
    });

    it('throws ACCOUNT_NOT_FOUND for an account that does not exist', async () => {
      const useCase = new RefreshBankAccountUseCase(accounts, clock);

      await expect(
        unitOfWork.run((executor) =>
          useCase.execute({ accountId: 'nope', balanceCents: 1, card: null }, executor),
        ),
      ).rejects.toBeInstanceOf(AccountNotFoundError);
    });
  });

  describe('ConvertAccountToManualUseCase', () => {
    it('makes the account manual, removes the bank balance and answers the last one', async () => {
      const id = await insertTestAccount(database.db, {
        source: 'pluggy',
        bank_balance_cents: 4200,
        bank_balance_at: '2026-11-01T00:00:00.000Z',
      });
      const useCase = new ConvertAccountToManualUseCase(accounts, clock);

      const answer = await unitOfWork.run((executor) =>
        useCase.execute({ accountId: id }, executor),
      );

      expect(answer).toEqual({ isCard: false, lastBankBalanceCents: 4200 });
      expect(await row(id)).toMatchObject({
        source: 'manual',
        bank_balance_cents: null,
        bank_balance_at: null,
      });
    });

    it('a card answers that it is one', async () => {
      const id = await insertTestCreditCard(database.db, {
        source: 'pluggy',
        bank_balance_cents: 100,
        bank_balance_at: '2026-11-01T00:00:00.000Z',
      });
      const useCase = new ConvertAccountToManualUseCase(accounts, clock);

      expect(
        await unitOfWork.run((executor) => useCase.execute({ accountId: id }, executor)),
      ).toMatchObject({ isCard: true });
    });

    it('an account that is already manual answers null and is not touched', async () => {
      const id = await insertTestAccount(database.db);
      const useCase = new ConvertAccountToManualUseCase(accounts, clock);

      expect(
        await unitOfWork.run((executor) => useCase.execute({ accountId: id }, executor)),
      ).toBeNull();
    });
  });

  describe('the readings', () => {
    it('lists the candidates of the same bank and type that are not archived, with the last 4 digits of a card', async () => {
      const mine = await insertTestAccount(database.db, { institution_code: 'nubank', name: 'A' });
      await insertTestAccount(database.db, { institution_code: 'nubank', type: 'savings' });
      await insertTestAccount(database.db, { institution_code: 'inter' });
      await insertTestAccount(database.db, {
        institution_code: 'nubank',
        archived_at: '2026-10-01T00:00:00.000Z',
      });
      const card = await insertTestCreditCard(database.db, { institution_code: 'nubank' });
      const query = new ListBankAccountCandidatesQuery(database.db);

      const checking = await query.execute({ institutionCode: 'nubank', type: 'checking' });
      const cards = await query.execute({ institutionCode: 'nubank', type: 'credit_card' });

      expect(checking.map((candidate) => candidate.accountId)).toEqual([mine]);
      expect(cards).toEqual([
        expect.objectContaining({ accountId: card, last4: '1234', source: 'manual' }),
      ]);
    });

    it('answers the summaries of the accounts that exist', async () => {
      const id = await insertTestAccount(database.db, { name: 'Conta X' });
      const query = new GetAccountSummariesQuery(database.db);

      const found = await query.execute([id, 'missing', id]);

      expect([...found.keys()]).toEqual([id]);
      expect(found.get(id)).toMatchObject({ name: 'Conta X', type: 'checking', source: 'manual' });
      expect((await query.execute([])).size).toBe(0);
    });
  });
});
