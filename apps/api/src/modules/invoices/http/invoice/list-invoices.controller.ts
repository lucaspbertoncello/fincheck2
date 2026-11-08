import type { ListInvoicesQuery } from '#/modules/invoices/application/invoice/list-invoices.query.ts';

export class ListInvoicesController {
  private readonly listInvoices: ListInvoicesQuery;

  constructor(listInvoices: ListInvoicesQuery) {
    this.listInvoices = listInvoices;
  }

  async handle(request: ListInvoicesController.Request): Promise<ListInvoicesController.Response> {
    return this.listInvoices.execute({ accountId: request.params.accountId, ...request.query });
  }
}

export namespace ListInvoicesController {
  export type Request = {
    params: { accountId: string };
    query: { from?: string | undefined; to?: string | undefined };
  };
  export type Response = ListInvoicesQuery.Output;
}
