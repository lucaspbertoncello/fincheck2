import type { BalanceAdjustment } from '@fincheck/shared/accounts/balance-adjustment/balance-adjustment.type.ts';

import type { AdjustAccountBalanceUseCase } from '#/modules/accounts/application/account/adjust-account-balance.usecase.ts';

export class AdjustAccountBalanceController {
  private readonly adjustAccountBalance: AdjustAccountBalanceUseCase;

  constructor(adjustAccountBalance: AdjustAccountBalanceUseCase) {
    this.adjustAccountBalance = adjustAccountBalance;
  }

  async handle(
    request: AdjustAccountBalanceController.Request,
  ): Promise<AdjustAccountBalanceController.Response> {
    return this.adjustAccountBalance.execute({ accountId: request.params.id, ...request.body });
  }
}

export namespace AdjustAccountBalanceController {
  export type Request = { params: { id: string }; body: BalanceAdjustment.Request };
  export type Response = BalanceAdjustment.Response;
}
