import type { GetBillQuery } from '#/modules/bills/application/bill/get-bill.query.ts';

export class GetBillController {
  private readonly getBill: GetBillQuery;

  constructor(getBill: GetBillQuery) {
    this.getBill = getBill;
  }

  async handle(request: GetBillController.Request): Promise<GetBillController.Response> {
    return this.getBill.execute(request.params);
  }
}

export namespace GetBillController {
  export type Request = { params: GetBillQuery.Input };
  export type Response = GetBillQuery.Output;
}
