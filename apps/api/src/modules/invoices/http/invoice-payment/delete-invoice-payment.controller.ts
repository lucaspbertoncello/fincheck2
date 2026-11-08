import type { DeleteInvoicePaymentUseCase } from '#/modules/invoices/application/invoice-payment/delete-invoice-payment.usecase.ts';

export class DeleteInvoicePaymentController {
  private readonly deleteInvoicePayment: DeleteInvoicePaymentUseCase;

  constructor(deleteInvoicePayment: DeleteInvoicePaymentUseCase) {
    this.deleteInvoicePayment = deleteInvoicePayment;
  }

  async handle(request: DeleteInvoicePaymentController.Request): Promise<void> {
    await this.deleteInvoicePayment.execute(request.params);
  }
}

export namespace DeleteInvoicePaymentController {
  export type Request = { params: DeleteInvoicePaymentUseCase.Input };
}
