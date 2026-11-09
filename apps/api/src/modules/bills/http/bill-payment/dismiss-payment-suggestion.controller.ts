import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { PaymentSuggestion } from '@fincheck/shared/common/payment-suggestion/payment-suggestion.type.ts';

import type { DismissBillPaymentSuggestionUseCase } from '#/modules/bills/application/bill-payment/dismiss-payment-suggestion.usecase.ts';

export class DismissBillPaymentSuggestionController {
  private readonly dismissBillPaymentSuggestion: DismissBillPaymentSuggestionUseCase;

  constructor(dismissBillPaymentSuggestion: DismissBillPaymentSuggestionUseCase) {
    this.dismissBillPaymentSuggestion = dismissBillPaymentSuggestion;
  }

  async handle(
    request: DismissBillPaymentSuggestionController.Request,
  ): Promise<DismissBillPaymentSuggestionController.Response> {
    return this.dismissBillPaymentSuggestion.execute({ ...request.params, ...request.body });
  }
}

export namespace DismissBillPaymentSuggestionController {
  export type Request = { params: BillContract.Params; body: PaymentSuggestion.DismissRequest };
  export type Response = DismissBillPaymentSuggestionUseCase.Output;
}
