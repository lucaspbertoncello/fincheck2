import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { ConvertAccountToManualUseCase } from '#/modules/accounts/application/bank-account/convert-account-to-manual.usecase.ts';
import { GetAccountSummariesQuery } from '#/modules/accounts/application/bank-account/get-account-summaries.query.ts';
import { ImportBankAccountUseCase } from '#/modules/accounts/application/bank-account/import-bank-account.usecase.ts';
import { ListBankAccountCandidatesQuery } from '#/modules/accounts/application/bank-account/list-bank-account-candidates.query.ts';
import { RefreshBankAccountUseCase } from '#/modules/accounts/application/bank-account/refresh-bank-account.usecase.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';
import type { SyncAccounts } from '#/modules/sync/application/import/sync-accounts.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// What `sync` asks of `accounts` (the port `SyncAccounts`): create, refresh and hand back to manual
// the accounts of the bank, and read the candidates of a reconnection and the name of each account.
export function createAccountsSyncPorts(deps: {
  db: Kysely<Database>;
  accounts: AccountRepository<Kysely<Database>>;
  clock: Clock;
}): SyncAccounts {
  const importAccount = new ImportBankAccountUseCase(deps.accounts, deps.clock);
  const refresh = new RefreshBankAccountUseCase(deps.accounts, deps.clock);
  const convert = new ConvertAccountToManualUseCase(deps.accounts, deps.clock);
  const candidates = new ListBankAccountCandidatesQuery(deps.db);
  const summaries = new GetAccountSummariesQuery(deps.db);

  return {
    create: (input, executor) => importAccount.execute(input, executor),
    refresh: (input, executor) => refresh.execute(input, executor),
    convertToManual: (accountId, executor) => convert.execute({ accountId }, executor),
    findCandidates: (input, executor) => candidates.execute(input, executor),
    summaries: (accountIds, executor) => summaries.execute(accountIds, executor),
  };
}
