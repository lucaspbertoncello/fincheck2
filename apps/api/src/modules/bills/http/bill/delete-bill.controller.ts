import type { DeleteBillUseCase } from '#/modules/bills/application/bill/delete-bill.usecase.ts';

export class DeleteBillController {
  private readonly deleteBill: DeleteBillUseCase;

  constructor(deleteBill: DeleteBillUseCase) {
    this.deleteBill = deleteBill;
  }

  async handle(request: DeleteBillController.Request): Promise<void> {
    await this.deleteBill.execute(request.params);
  }
}

export namespace DeleteBillController {
  export type Request = { params: DeleteBillUseCase.Input };
}
