import type { BulkTransactionsUseCase } from '#/modules/transactions/application/transaction/bulk-transactions.usecase.ts';

export class BulkTransactionsController {
  private readonly bulkTransactions: BulkTransactionsUseCase;

  constructor(bulkTransactions: BulkTransactionsUseCase) {
    this.bulkTransactions = bulkTransactions;
  }

  async handle(
    request: BulkTransactionsController.Request,
  ): Promise<BulkTransactionsController.Response> {
    return this.bulkTransactions.execute(request.body);
  }
}

export namespace BulkTransactionsController {
  export type Request = { body: BulkTransactionsUseCase.Input };
  export type Response = BulkTransactionsUseCase.Output;
}
