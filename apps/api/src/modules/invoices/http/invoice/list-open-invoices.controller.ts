import type { ListOpenInvoicesQuery } from '#/modules/invoices/application/invoice/list-open-invoices.query.ts';

export class ListOpenInvoicesController {
  private readonly listOpenInvoices: ListOpenInvoicesQuery;

  constructor(listOpenInvoices: ListOpenInvoicesQuery) {
    this.listOpenInvoices = listOpenInvoices;
  }

  async handle(): Promise<ListOpenInvoicesController.Response> {
    return this.listOpenInvoices.execute();
  }
}

export namespace ListOpenInvoicesController {
  export type Response = ListOpenInvoicesQuery.Output;
}
