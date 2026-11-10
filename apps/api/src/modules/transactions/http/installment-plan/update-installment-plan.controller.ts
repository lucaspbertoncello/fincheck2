import type { UpdateInstallmentPlanUseCase } from '#/modules/transactions/application/installment-plan/update-installment-plan.usecase.ts';

export class UpdateInstallmentPlanController {
  private readonly updateInstallmentPlan: UpdateInstallmentPlanUseCase;

  constructor(updateInstallmentPlan: UpdateInstallmentPlanUseCase) {
    this.updateInstallmentPlan = updateInstallmentPlan;
  }

  async handle(
    request: UpdateInstallmentPlanController.Request,
  ): Promise<UpdateInstallmentPlanController.Response> {
    return this.updateInstallmentPlan.execute({ id: request.params.id, ...request.body });
  }
}

export namespace UpdateInstallmentPlanController {
  export type Request = {
    params: { id: string };
    body: Omit<UpdateInstallmentPlanUseCase.Input, 'id'>;
  };
  export type Response = UpdateInstallmentPlanUseCase.Output;
}
