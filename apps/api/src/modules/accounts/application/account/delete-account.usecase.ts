import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { DeleteAccountInvoices } from '#/modules/accounts/application/account/delete-account-invoices.interface.ts';
import type { DeleteAccountRules } from '#/modules/accounts/application/account/delete-account-rules.interface.ts';
import type { DeleteAccountTransactions } from '#/modules/accounts/application/account/delete-account-transactions.interface.ts';
import { AccountNotFoundError } from '#/modules/accounts/domain/account/account-not-found.error.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// Deletes the account and all that is its, with no undo (BR-ACC-008). One unit of work: the
// invoices of the card (`invoices`), the plans and the transactions (`transactions`) and the rules
// with a condition on the account (`categories`) go first, each by the use case of its owner; then
// the card data and the account. If anything fails, nothing is deleted.
export class DeleteAccountUseCase {
  private readonly accounts: AccountRepository<Kysely<Database>>;
  private readonly deleteInvoices: DeleteAccountInvoices;
  private readonly deleteTransactions: DeleteAccountTransactions;
  private readonly deleteRules: DeleteAccountRules;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;

  constructor(
    accounts: AccountRepository<Kysely<Database>>,
    deleteInvoices: DeleteAccountInvoices,
    deleteTransactions: DeleteAccountTransactions,
    deleteRules: DeleteAccountRules,
    unitOfWork: UnitOfWork<Kysely<Database>>,
  ) {
    this.accounts = accounts;
    this.deleteInvoices = deleteInvoices;
    this.deleteTransactions = deleteTransactions;
    this.deleteRules = deleteRules;
    this.unitOfWork = unitOfWork;
  }

  async execute(input: DeleteAccountUseCase.Input): Promise<void> {
    await this.unitOfWork.run(async (executor) => {
      const account = await this.accounts.findById(input.accountId, executor);
      if (!account) throw new AccountNotFoundError();

      if (account.isCard()) await this.deleteInvoices.execute(account.id, executor);
      await this.deleteTransactions.execute(account.id, executor);
      await this.deleteRules.execute(account.id, executor);
      await this.accounts.delete(account.id, executor);
    });
  }
}

export namespace DeleteAccountUseCase {
  export type Input = { accountId: string };
}
