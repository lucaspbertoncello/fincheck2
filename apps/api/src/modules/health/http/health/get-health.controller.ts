import type { Health } from '@fincheck/shared/health/health/health.type.ts';

import type { CheckDatabaseQuery } from '#/modules/health/application/health/check-database.query.ts';

export class GetHealthController {
  private readonly checkDatabase: CheckDatabaseQuery;

  constructor(checkDatabase: CheckDatabaseQuery) {
    this.checkDatabase = checkDatabase;
  }

  async handle(): Promise<GetHealthController.Response> {
    const databaseUp = await this.checkDatabase.execute();

    return {
      status: databaseUp ? 'ok' : 'degraded',
      database: databaseUp ? 'ok' : 'unavailable',
    };
  }
}

export namespace GetHealthController {
  export type Response = Health.Dto;
}
