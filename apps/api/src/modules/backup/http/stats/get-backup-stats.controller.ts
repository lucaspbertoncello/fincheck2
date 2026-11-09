import type { GetBackupStatsQuery } from '#/modules/backup/application/stats/get-backup-stats.query.ts';

export class GetBackupStatsController {
  private readonly getBackupStats: GetBackupStatsQuery;

  constructor(getBackupStats: GetBackupStatsQuery) {
    this.getBackupStats = getBackupStats;
  }

  async handle(): Promise<GetBackupStatsController.Response> {
    return this.getBackupStats.execute();
  }
}

export namespace GetBackupStatsController {
  export type Response = GetBackupStatsQuery.Output;
}
