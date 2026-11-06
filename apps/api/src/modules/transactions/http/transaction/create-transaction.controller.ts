import type { CreateTransactionUseCase } from '#/modules/transactions/application/transaction/create-transaction.usecase.ts';

export class CreateTransactionController {
  private readonly createTransaction: CreateTransactionUseCase;

  constructor(createTransaction: CreateTransactionUseCase) {
    this.createTransaction = createTransaction;
  }

  async handle(
    request: CreateTransactionController.Request,
  ): Promise<CreateTransactionController.Response> {
    return this.createTransaction.execute(request.body);
  }
}

export namespace CreateTransactionController {
  export type Request = { body: CreateTransactionUseCase.Input };
  export type Response = CreateTransactionUseCase.Output;
}
