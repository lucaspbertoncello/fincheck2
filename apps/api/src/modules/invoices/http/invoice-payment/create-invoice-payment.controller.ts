import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';
import type { InvoicePayment } from '@fincheck/shared/invoices/invoice-payment/invoice-payment.type.ts';

import type { CreateInvoicePaymentUseCase } from '#/modules/invoices/application/invoice-payment/create-invoice-payment.usecase.ts';

export class CreateInvoicePaymentController {
  private readonly createInvoicePayment: CreateInvoicePaymentUseCase;

  constructor(createInvoicePayment: CreateInvoicePaymentUseCase) {
    this.createInvoicePayment = createInvoicePayment;
  }

  async handle(
    request: CreateInvoicePaymentController.Request,
  ): Promise<CreateInvoicePaymentController.Response> {
    return this.createInvoicePayment.execute({ ...request.params, ...request.body });
  }
}

export namespace CreateInvoicePaymentController {
  export type Request = { params: Invoice.Params; body: InvoicePayment.CreateRequest };
  export type Response = CreateInvoicePaymentUseCase.Output;
}
