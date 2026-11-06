import type { BalanceHistory } from '@fincheck/shared/accounts/balance-history/balance-history.type.ts';

import type { GetBalanceHistoryUseCase } from '#/modules/accounts/application/account/get-balance-history.usecase.ts';

export class GetBalanceHistoryController {
  private readonly getBalanceHistory: GetBalanceHistoryUseCase;

  constructor(getBalanceHistory: GetBalanceHistoryUseCase) {
    this.getBalanceHistory = getBalanceHistory;
  }

  async handle(
    request: GetBalanceHistoryController.Request,
  ): Promise<GetBalanceHistoryController.Response> {
    return this.getBalanceHistory.execute({
      accountId: request.params.id,
      month: request.query.month,
    });
  }
}

export namespace GetBalanceHistoryController {
  export type Request = { params: { id: string }; query: BalanceHistory.Query };
  export type Response = BalanceHistory.Dto;
}
