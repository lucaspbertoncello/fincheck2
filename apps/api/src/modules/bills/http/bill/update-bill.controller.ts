import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';

import type { UpdateBillUseCase } from '#/modules/bills/application/bill/update-bill.usecase.ts';

export class UpdateBillController {
  private readonly updateBill: UpdateBillUseCase;

  constructor(updateBill: UpdateBillUseCase) {
    this.updateBill = updateBill;
  }

  async handle(request: UpdateBillController.Request): Promise<UpdateBillController.Response> {
    return this.updateBill.execute({ ...request.params, ...request.body });
  }
}

export namespace UpdateBillController {
  export type Request = { params: BillContract.Params; body: BillContract.UpdateRequest };
  export type Response = UpdateBillUseCase.Output;
}
