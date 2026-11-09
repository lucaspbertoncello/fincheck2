import type { ListBillsQuery } from '#/modules/bills/application/bill/list-bills.query.ts';

export class ListBillsController {
  private readonly listBills: ListBillsQuery;

  constructor(listBills: ListBillsQuery) {
    this.listBills = listBills;
  }

  async handle(request: ListBillsController.Request): Promise<ListBillsController.Response> {
    return this.listBills.execute(request.query);
  }
}

export namespace ListBillsController {
  export type Request = { query: ListBillsQuery.Input };
  export type Response = ListBillsQuery.Output;
}
