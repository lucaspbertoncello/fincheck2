import type { UpdateTransactionUseCase } from '#/modules/transactions/application/transaction/update-transaction.usecase.ts';

export class UpdateTransactionController {
  private readonly updateTransaction: UpdateTransactionUseCase;

  constructor(updateTransaction: UpdateTransactionUseCase) {
    this.updateTransaction = updateTransaction;
  }

  async handle(
    request: UpdateTransactionController.Request,
  ): Promise<UpdateTransactionController.Response> {
    return this.updateTransaction.execute({ id: request.params.id, ...request.body });
  }
}

export namespace UpdateTransactionController {
  export type Request = {
    params: { id: string };
    body: Omit<UpdateTransactionUseCase.Input, 'id'>;
  };
  export type Response = UpdateTransactionUseCase.Output;
}
