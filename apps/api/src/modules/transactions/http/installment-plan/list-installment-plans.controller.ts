import type { ListInstallmentPlansQuery } from '#/modules/transactions/application/installment-plan/list-installment-plans.query.ts';

export class ListInstallmentPlansController {
  private readonly listInstallmentPlans: ListInstallmentPlansQuery;

  constructor(listInstallmentPlans: ListInstallmentPlansQuery) {
    this.listInstallmentPlans = listInstallmentPlans;
  }

  async handle(
    request: ListInstallmentPlansController.Request,
  ): Promise<ListInstallmentPlansController.Response> {
    return this.listInstallmentPlans.execute(request.query);
  }
}

export namespace ListInstallmentPlansController {
  export type Request = { query: ListInstallmentPlansQuery.Input };
  export type Response = ListInstallmentPlansQuery.Output;
}
