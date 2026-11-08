import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import type { UpdateInvoiceUseCase } from '#/modules/invoices/application/invoice/update-invoice.usecase.ts';

export class UpdateInvoiceController {
  private readonly updateInvoice: UpdateInvoiceUseCase;

  constructor(updateInvoice: UpdateInvoiceUseCase) {
    this.updateInvoice = updateInvoice;
  }

  async handle(
    request: UpdateInvoiceController.Request,
  ): Promise<UpdateInvoiceController.Response> {
    return this.updateInvoice.execute({ ...request.params, ...request.body });
  }
}

export namespace UpdateInvoiceController {
  export type Request = { params: Invoice.Params; body: Invoice.UpdateRequest };
  export type Response = UpdateInvoiceUseCase.Output;
}
