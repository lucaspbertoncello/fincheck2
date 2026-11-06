import type { DeleteInstallmentPlanUseCase } from '#/modules/transactions/application/installment-plan/delete-installment-plan.usecase.ts';

export class DeleteInstallmentPlanController {
  private readonly deleteInstallmentPlan: DeleteInstallmentPlanUseCase;

  constructor(deleteInstallmentPlan: DeleteInstallmentPlanUseCase) {
    this.deleteInstallmentPlan = deleteInstallmentPlan;
  }

  async handle(request: DeleteInstallmentPlanController.Request): Promise<void> {
    await this.deleteInstallmentPlan.execute({ id: request.params.id });
  }
}

export namespace DeleteInstallmentPlanController {
  export type Request = { params: { id: string } };
}
