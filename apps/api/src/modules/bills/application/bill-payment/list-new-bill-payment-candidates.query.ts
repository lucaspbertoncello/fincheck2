import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';

import type { BillPaymentCandidateFinder } from '#/modules/bills/application/bill-payment/bill-payment-candidate-finder.service.ts';

// The Pix Lucas may tie to a debt that does not exist yet ("já feito, só falta ligar" in the modal
// of a debt with a friend). Same rules as the candidates of a bill, with no dismissal.
export class ListNewBillPaymentCandidatesQuery {
  private readonly finder: BillPaymentCandidateFinder;

  constructor(finder: BillPaymentCandidateFinder) {
    this.finder = finder;
  }

  async execute(
    input: ListNewBillPaymentCandidatesQuery.Input,
  ): Promise<ListNewBillPaymentCandidatesQuery.Output> {
    return {
      items: await this.finder.find({
        direction: input.direction,
        counterparty: input.counterparty ?? null,
        dismissedTransactionIds: [],
      }),
    };
  }
}

export namespace ListNewBillPaymentCandidatesQuery {
  export type Input = BillContract.PaymentCandidatesQuery;
  export type Output = { items: BillContract.PaymentCandidateDto[] };
}
