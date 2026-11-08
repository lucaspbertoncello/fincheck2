import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import type { PaymentSuggestion } from '@fincheck/shared/common/payment-suggestion/payment-suggestion.type.ts';

import type { UndoPaymentSuggestionDismissalUseCase } from '#/modules/invoices/application/invoice-payment/undo-payment-suggestion-dismissal.usecase.ts';

export class UndoPaymentSuggestionDismissalController {
  private readonly undoPaymentSuggestionDismissal: UndoPaymentSuggestionDismissalUseCase;

  constructor(undoPaymentSuggestionDismissal: UndoPaymentSuggestionDismissalUseCase) {
    this.undoPaymentSuggestionDismissal = undoPaymentSuggestionDismissal;
  }

  async handle(
    request: UndoPaymentSuggestionDismissalController.Request,
  ): Promise<UndoPaymentSuggestionDismissalController.Response> {
    return this.undoPaymentSuggestionDismissal.execute({ ...request.params, ...request.query });
  }
}

export namespace UndoPaymentSuggestionDismissalController {
  export type Request = { params: Invoice.Params; query: PaymentSuggestion.DismissQuery };
  export type Response = UndoPaymentSuggestionDismissalUseCase.Output;
}
