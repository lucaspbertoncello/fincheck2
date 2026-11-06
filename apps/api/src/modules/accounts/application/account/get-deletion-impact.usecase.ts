import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { DeletionImpact } from '@fincheck/shared/accounts/deletion-impact/deletion-impact.type.ts';

import type { AccountConnectionReader } from '#/modules/accounts/application/account/account-connection-reader.interface.ts';
import type { AccountInvoicesReader } from '#/modules/accounts/application/account/account-invoices-reader.interface.ts';
import type { AccountRulesReader } from '#/modules/accounts/application/account/account-rules-reader.interface.ts';
import type { AccountTransactionsReader } from '#/modules/accounts/application/account/account-transactions-reader.interface.ts';
import { AccountNotFoundError } from '#/modules/accounts/domain/account/account-not-found.error.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// What deleting the account takes with it, for the confirmation ("142 transações serão apagadas").
// A Pluggy account comes back in the next sync while its connection is active (BR-ACC-008).
export class GetDeletionImpactUseCase {
  private readonly accounts: AccountRepository<Kysely<Database>>;
  private readonly transactions: AccountTransactionsReader;
  private readonly invoices: AccountInvoicesReader;
  private readonly rules: AccountRulesReader;
  private readonly connections: AccountConnectionReader;

  constructor(
    accounts: AccountRepository<Kysely<Database>>,
    transactions: AccountTransactionsReader,
    invoices: AccountInvoicesReader,
    rules: AccountRulesReader,
    connections: AccountConnectionReader,
  ) {
    this.accounts = accounts;
    this.transactions = transactions;
    this.invoices = invoices;
    this.rules = rules;
    this.connections = connections;
  }

  async execute(input: GetDeletionImpactUseCase.Input): Promise<GetDeletionImpactUseCase.Output> {
    const account = await this.accounts.findById(input.accountId);
    if (!account) throw new AccountNotFoundError();

    const [counts, invoiceCount, ruleCount, connections] = await Promise.all([
      this.transactions.countsOf(account.id),
      account.isCard() ? this.invoices.countOf(account.id) : 0,
      this.rules.countOf(account.id),
      account.isPluggy()
        ? this.connections.connectionsOf([account.id])
        : new Map<string, Account.Connection>(),
    ]);

    return {
      transactionCount: counts.transactionCount,
      installmentPlanCount: account.isCard() ? counts.installmentPlanCount : 0,
      invoiceCount,
      ruleCount,
      isPluggy: account.isPluggy(),
      returnsOnNextSync: account.isPluggy() && connections.get(account.id)?.status === 'active',
    };
  }
}

export namespace GetDeletionImpactUseCase {
  export type Input = { accountId: string };
  export type Output = DeletionImpact.Dto;
}
