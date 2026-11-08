import type { GetInvoiceQuery } from '#/modules/invoices/application/invoice/get-invoice.query.ts';

export class GetInvoiceController {
  private readonly getInvoice: GetInvoiceQuery;

  constructor(getInvoice: GetInvoiceQuery) {
    this.getInvoice = getInvoice;
  }

  async handle(request: GetInvoiceController.Request): Promise<GetInvoiceController.Response> {
    return this.getInvoice.execute(request.params);
  }
}

export namespace GetInvoiceController {
  export type Request = { params: GetInvoiceQuery.Input };
  export type Response = GetInvoiceQuery.Output;
}
