import type { UnignoreTransactionUseCase } from '#/modules/transactions/application/transaction/unignore-transaction.usecase.ts';

export class UnignoreTransactionController {
  private readonly unignoreTransaction: UnignoreTransactionUseCase;

  constructor(unignoreTransaction: UnignoreTransactionUseCase) {
    this.unignoreTransaction = unignoreTransaction;
  }

  async handle(
    request: UnignoreTransactionController.Request,
  ): Promise<UnignoreTransactionController.Response> {
    return this.unignoreTransaction.execute({ id: request.params.id });
  }
}

export namespace UnignoreTransactionController {
  export type Request = { params: { id: string } };
  export type Response = UnignoreTransactionUseCase.Output;
}
