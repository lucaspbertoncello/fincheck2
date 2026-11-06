import type { CreateInstallmentPlanUseCase } from '#/modules/transactions/application/installment-plan/create-installment-plan.usecase.ts';

export class CreateInstallmentPlanController {
  private readonly createInstallmentPlan: CreateInstallmentPlanUseCase;

  constructor(createInstallmentPlan: CreateInstallmentPlanUseCase) {
    this.createInstallmentPlan = createInstallmentPlan;
  }

  async handle(
    request: CreateInstallmentPlanController.Request,
  ): Promise<CreateInstallmentPlanController.Response> {
    return this.createInstallmentPlan.execute(request.body);
  }
}

export namespace CreateInstallmentPlanController {
  export type Request = { body: CreateInstallmentPlanUseCase.Input };
  export type Response = CreateInstallmentPlanUseCase.Output;
}
