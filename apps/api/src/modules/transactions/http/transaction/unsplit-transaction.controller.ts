import type { UnsplitTransactionUseCase } from '#/modules/transactions/application/transaction/unsplit-transaction.usecase.ts';

export class UnsplitTransactionController {
  private readonly unsplitTransaction: UnsplitTransactionUseCase;

  constructor(unsplitTransaction: UnsplitTransactionUseCase) {
    this.unsplitTransaction = unsplitTransaction;
  }

  async handle(
    request: UnsplitTransactionController.Request,
  ): Promise<UnsplitTransactionController.Response> {
    return this.unsplitTransaction.execute({ id: request.params.id });
  }
}

export namespace UnsplitTransactionController {
  export type Request = { params: { id: string } };
  export type Response = UnsplitTransactionUseCase.Output;
}
