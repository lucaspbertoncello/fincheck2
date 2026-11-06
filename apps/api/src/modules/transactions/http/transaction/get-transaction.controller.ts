import type { GetTransactionQuery } from '#/modules/transactions/application/transaction/get-transaction.query.ts';

export class GetTransactionController {
  private readonly getTransaction: GetTransactionQuery;

  constructor(getTransaction: GetTransactionQuery) {
    this.getTransaction = getTransaction;
  }

  async handle(
    request: GetTransactionController.Request,
  ): Promise<GetTransactionController.Response> {
    return this.getTransaction.execute({ id: request.params.id });
  }
}

export namespace GetTransactionController {
  export type Request = { params: { id: string } };
  export type Response = GetTransactionQuery.Output;
}
