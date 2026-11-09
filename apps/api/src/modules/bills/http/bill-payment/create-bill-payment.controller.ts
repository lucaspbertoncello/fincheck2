import type { Bill as BillContract } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { BillPayment as BillPaymentContract } from '@fincheck/shared/bills/bill-payment/bill-payment.type.ts';

import type { CreateBillPaymentUseCase } from '#/modules/bills/application/bill-payment/create-bill-payment.usecase.ts';

export class CreateBillPaymentController {
  private readonly createBillPayment: CreateBillPaymentUseCase;

  constructor(createBillPayment: CreateBillPaymentUseCase) {
    this.createBillPayment = createBillPayment;
  }

  async handle(
    request: CreateBillPaymentController.Request,
  ): Promise<CreateBillPaymentController.Response> {
    return this.createBillPayment.execute({ ...request.params, ...request.body });
  }
}

export namespace CreateBillPaymentController {
  export type Request = { params: BillContract.Params; body: BillPaymentContract.CreateRequest };
  export type Response = CreateBillPaymentUseCase.Output;
}
