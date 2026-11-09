import type { ListBillPaymentCandidatesQuery } from '#/modules/bills/application/bill-payment/list-bill-payment-candidates.query.ts';

export class ListBillPaymentCandidatesController {
  private readonly listBillPaymentCandidates: ListBillPaymentCandidatesQuery;

  constructor(listBillPaymentCandidates: ListBillPaymentCandidatesQuery) {
    this.listBillPaymentCandidates = listBillPaymentCandidates;
  }

  async handle(
    request: ListBillPaymentCandidatesController.Request,
  ): Promise<ListBillPaymentCandidatesController.Response> {
    return this.listBillPaymentCandidates.execute(request.params);
  }
}

export namespace ListBillPaymentCandidatesController {
  export type Request = { params: ListBillPaymentCandidatesQuery.Input };
  export type Response = ListBillPaymentCandidatesQuery.Output;
}
