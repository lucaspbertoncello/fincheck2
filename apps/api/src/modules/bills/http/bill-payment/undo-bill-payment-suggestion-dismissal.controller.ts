import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { PaymentSuggestion } from '@fincheck/shared/common/payment-suggestion/payment-suggestion.type.ts';

import type { UndoBillPaymentSuggestionDismissalUseCase } from '#/modules/bills/application/bill-payment/undo-bill-payment-suggestion-dismissal.usecase.ts';

export class UndoBillPaymentSuggestionDismissalController {
  private readonly undoBillPaymentSuggestionDismissal: UndoBillPaymentSuggestionDismissalUseCase;

  constructor(undoBillPaymentSuggestionDismissal: UndoBillPaymentSuggestionDismissalUseCase) {
    this.undoBillPaymentSuggestionDismissal = undoBillPaymentSuggestionDismissal;
  }

  async handle(
    request: UndoBillPaymentSuggestionDismissalController.Request,
  ): Promise<UndoBillPaymentSuggestionDismissalController.Response> {
    return this.undoBillPaymentSuggestionDismissal.execute({ ...request.params, ...request.query });
  }
}

export namespace UndoBillPaymentSuggestionDismissalController {
  export type Request = { params: BillContract.Params; query: PaymentSuggestion.DismissQuery };
  export type Response = UndoBillPaymentSuggestionDismissalUseCase.Output;
}
