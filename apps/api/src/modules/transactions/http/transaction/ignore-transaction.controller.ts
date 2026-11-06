import type { IgnoreTransactionUseCase } from '#/modules/transactions/application/transaction/ignore-transaction.usecase.ts';

export class IgnoreTransactionController {
  private readonly ignoreTransaction: IgnoreTransactionUseCase;

  constructor(ignoreTransaction: IgnoreTransactionUseCase) {
    this.ignoreTransaction = ignoreTransaction;
  }

  async handle(
    request: IgnoreTransactionController.Request,
  ): Promise<IgnoreTransactionController.Response> {
    return this.ignoreTransaction.execute({ id: request.params.id });
  }
}

export namespace IgnoreTransactionController {
  export type Request = { params: { id: string } };
  export type Response = IgnoreTransactionUseCase.Output;
}
