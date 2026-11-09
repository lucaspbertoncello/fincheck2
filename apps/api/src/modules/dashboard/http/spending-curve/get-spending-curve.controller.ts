import type { GetSpendingCurveQuery } from '#/modules/dashboard/application/spending-curve/get-spending-curve.query.ts';

export class GetSpendingCurveController {
  private readonly getSpendingCurve: GetSpendingCurveQuery;

  constructor(getSpendingCurve: GetSpendingCurveQuery) {
    this.getSpendingCurve = getSpendingCurve;
  }

  async handle(
    request: GetSpendingCurveController.Request,
  ): Promise<GetSpendingCurveController.Response> {
    return this.getSpendingCurve.execute(request.query);
  }
}

export namespace GetSpendingCurveController {
  export type Request = { query: GetSpendingCurveQuery.Input };
  export type Response = GetSpendingCurveQuery.Output;
}
