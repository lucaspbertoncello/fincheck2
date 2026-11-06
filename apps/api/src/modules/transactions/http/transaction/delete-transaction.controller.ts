import type { DeleteTransactionUseCase } from '#/modules/transactions/application/transaction/delete-transaction.usecase.ts';

export class DeleteTransactionController {
  private readonly deleteTransaction: DeleteTransactionUseCase;

  constructor(deleteTransaction: DeleteTransactionUseCase) {
    this.deleteTransaction = deleteTransaction;
  }

  async handle(request: DeleteTransactionController.Request): Promise<void> {
    await this.deleteTransaction.execute({ id: request.params.id });
  }
}

export namespace DeleteTransactionController {
  export type Request = { params: { id: string } };
}
