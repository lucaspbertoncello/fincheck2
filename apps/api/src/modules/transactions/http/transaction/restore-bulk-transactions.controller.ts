import type { RestoreBulkTransactionsUseCase } from '#/modules/transactions/application/transaction/restore-bulk-transactions.usecase.ts';

export class RestoreBulkTransactionsController {
  private readonly restoreBulkTransactions: RestoreBulkTransactionsUseCase;

  constructor(restoreBulkTransactions: RestoreBulkTransactionsUseCase) {
    this.restoreBulkTransactions = restoreBulkTransactions;
  }

  async handle(
    request: RestoreBulkTransactionsController.Request,
  ): Promise<RestoreBulkTransactionsController.Response> {
    return this.restoreBulkTransactions.execute(request.body);
  }
}

export namespace RestoreBulkTransactionsController {
  export type Request = { body: RestoreBulkTransactionsUseCase.Input };
  export type Response = RestoreBulkTransactionsUseCase.Output;
}
