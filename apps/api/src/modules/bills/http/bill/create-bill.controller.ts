import type { CreateBillUseCase } from '#/modules/bills/application/bill/create-bill.usecase.ts';

export class CreateBillController {
  private readonly createBill: CreateBillUseCase;

  constructor(createBill: CreateBillUseCase) {
    this.createBill = createBill;
  }

  async handle(request: CreateBillController.Request): Promise<CreateBillController.Response> {
    return this.createBill.execute(request.body);
  }
}

export namespace CreateBillController {
  export type Request = { body: CreateBillUseCase.Input };
  export type Response = CreateBillUseCase.Output;
}
