import type { GetTransactionSummaryQuery } from '#/modules/transactions/application/transaction/get-transaction-summary.query.ts';

export class GetTransactionSummaryController {
  private readonly getTransactionSummary: GetTransactionSummaryQuery;

  constructor(getTransactionSummary: GetTransactionSummaryQuery) {
    this.getTransactionSummary = getTransactionSummary;
  }

  async handle(
    request: GetTransactionSummaryController.Request,
  ): Promise<GetTransactionSummaryController.Response> {
    return this.getTransactionSummary.execute(request.query);
  }
}

export namespace GetTransactionSummaryController {
  export type Request = { query: GetTransactionSummaryQuery.Input };
  export type Response = GetTransactionSummaryQuery.Output;
}
