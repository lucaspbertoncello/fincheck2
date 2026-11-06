import type { SplitTransactionUseCase } from '#/modules/transactions/application/transaction/split-transaction.usecase.ts';

export class SplitTransactionController {
  private readonly splitTransaction: SplitTransactionUseCase;

  constructor(splitTransaction: SplitTransactionUseCase) {
    this.splitTransaction = splitTransaction;
  }

  async handle(
    request: SplitTransactionController.Request,
  ): Promise<SplitTransactionController.Response> {
    return this.splitTransaction.execute({ id: request.params.id, ...request.body });
  }
}

export namespace SplitTransactionController {
  export type Request = { params: { id: string }; body: Omit<SplitTransactionUseCase.Input, 'id'> };
  export type Response = SplitTransactionUseCase.Output;
}
