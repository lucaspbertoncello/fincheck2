import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import type { PaymentSuggestion } from '@fincheck/shared/common/payment-suggestion/payment-suggestion.type.ts';

import type { DismissPaymentSuggestionUseCase } from '#/modules/invoices/application/invoice-payment/dismiss-payment-suggestion.usecase.ts';

export class DismissPaymentSuggestionController {
  private readonly dismissPaymentSuggestion: DismissPaymentSuggestionUseCase;

  constructor(dismissPaymentSuggestion: DismissPaymentSuggestionUseCase) {
    this.dismissPaymentSuggestion = dismissPaymentSuggestion;
  }

  async handle(
    request: DismissPaymentSuggestionController.Request,
  ): Promise<DismissPaymentSuggestionController.Response> {
    return this.dismissPaymentSuggestion.execute({ ...request.params, ...request.body });
  }
}

export namespace DismissPaymentSuggestionController {
  export type Request = { params: Invoice.Params; body: PaymentSuggestion.DismissRequest };
  export type Response = DismissPaymentSuggestionUseCase.Output;
}
