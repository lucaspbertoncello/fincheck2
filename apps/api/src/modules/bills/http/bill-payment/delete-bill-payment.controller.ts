import type { DeleteBillPaymentUseCase } from '#/modules/bills/application/bill-payment/delete-bill-payment.usecase.ts';

export class DeleteBillPaymentController {
  private readonly deleteBillPayment: DeleteBillPaymentUseCase;

  constructor(deleteBillPayment: DeleteBillPaymentUseCase) {
    this.deleteBillPayment = deleteBillPayment;
  }

  async handle(request: DeleteBillPaymentController.Request): Promise<void> {
    await this.deleteBillPayment.execute(request.params);
  }
}

export namespace DeleteBillPaymentController {
  export type Request = { params: DeleteBillPaymentUseCase.Input };
}
