import type { BackupStats } from '@fincheck/shared/backup/backup-stats/backup-stats.type.ts';

import type { ActiveAccountCounter } from '#/modules/backup/application/stats/active-account-counter.interface.ts';
import type { DatabaseSizeReader } from '#/modules/backup/application/stats/database-size-reader.interface.ts';
import type { TransactionOverviewReader } from '#/modules/backup/application/stats/transaction-overview-reader.interface.ts';

// `GET /backup/stats` (BR-BKP-003): the numbers on top of the page Dados. The size is read from the
// disk; the counts come from the owners (`transactions` and `accounts`) through their queries.
export class GetBackupStatsQuery {
  private readonly size: DatabaseSizeReader;
  private readonly transactions: TransactionOverviewReader;
  private readonly accounts: ActiveAccountCounter;

  constructor(
    size: DatabaseSizeReader,
    transactions: TransactionOverviewReader,
    accounts: ActiveAccountCounter,
  ) {
    this.size = size;
    this.transactions = transactions;
    this.accounts = accounts;
  }

  async execute(): Promise<GetBackupStatsQuery.Output> {
    const [dbSizeBytes, overview, accountCount] = await Promise.all([
      this.size.readBytes(),
      this.transactions.execute(),
      this.accounts.execute(),
    ]);

    return {
      dbSizeBytes,
      transactionCount: overview.count,
      accountCount,
      firstTransactionOn: overview.firstOccurredOn,
    };
  }
}

export namespace GetBackupStatsQuery {
  export type Output = BackupStats.Dto;
}
