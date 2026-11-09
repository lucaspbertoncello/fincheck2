import type { ListBillCounterpartiesQuery } from '#/modules/bills/application/bill/list-bill-counterparties.query.ts';

export class ListBillCounterpartiesController {
  private readonly listBillCounterparties: ListBillCounterpartiesQuery;

  constructor(listBillCounterparties: ListBillCounterpartiesQuery) {
    this.listBillCounterparties = listBillCounterparties;
  }

  async handle(): Promise<ListBillCounterpartiesController.Response> {
    return this.listBillCounterparties.execute();
  }
}

export namespace ListBillCounterpartiesController {
  export type Response = ListBillCounterpartiesQuery.Output;
}
