import type { GetFreeBalanceQuery } from '#/modules/dashboard/application/free-balance/get-free-balance.query.ts';
import type { OccurrenceEnsurer } from '#/modules/dashboard/application/occurrence/occurrence-ensurer.interface.ts';

// Creates the occurrences that are missing, then reads: the queries never write.
export class GetFreeBalanceController {
  private readonly ensureOccurrences: OccurrenceEnsurer;
  private readonly getFreeBalance: GetFreeBalanceQuery;

  constructor(ensureOccurrences: OccurrenceEnsurer, getFreeBalance: GetFreeBalanceQuery) {
    this.ensureOccurrences = ensureOccurrences;
    this.getFreeBalance = getFreeBalance;
  }

  async handle(): Promise<GetFreeBalanceController.Response> {
    await this.ensureOccurrences.execute();

    return this.getFreeBalance.execute();
  }
}

export namespace GetFreeBalanceController {
  export type Response = GetFreeBalanceQuery.Output;
}
