import type { ListTransactionsQuery } from '#/modules/transactions/application/transaction/list-transactions.query.ts';

export class ListTransactionsController {
  private readonly listTransactions: ListTransactionsQuery;

  constructor(listTransactions: ListTransactionsQuery) {
    this.listTransactions = listTransactions;
  }

  async handle(
    request: ListTransactionsController.Request,
  ): Promise<ListTransactionsController.Response> {
    return this.listTransactions.execute(request.query);
  }
}

export namespace ListTransactionsController {
  export type Request = { query: ListTransactionsQuery.Input };
  export type Response = ListTransactionsQuery.Output;
}
