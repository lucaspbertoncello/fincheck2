import type { ListNewBillPaymentCandidatesQuery } from '#/modules/bills/application/bill-payment/list-new-bill-payment-candidates.query.ts';

export class ListNewBillPaymentCandidatesController {
  private readonly listNewBillPaymentCandidates: ListNewBillPaymentCandidatesQuery;

  constructor(listNewBillPaymentCandidates: ListNewBillPaymentCandidatesQuery) {
    this.listNewBillPaymentCandidates = listNewBillPaymentCandidates;
  }

  async handle(
    request: ListNewBillPaymentCandidatesController.Request,
  ): Promise<ListNewBillPaymentCandidatesController.Response> {
    return this.listNewBillPaymentCandidates.execute(request.query);
  }
}

export namespace ListNewBillPaymentCandidatesController {
  export type Request = { query: ListNewBillPaymentCandidatesQuery.Input };
  export type Response = ListNewBillPaymentCandidatesQuery.Output;
}
