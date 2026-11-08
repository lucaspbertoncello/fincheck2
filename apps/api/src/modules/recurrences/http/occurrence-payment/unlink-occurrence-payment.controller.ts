import type { UnlinkOccurrencePaymentUseCase } from '#/modules/recurrences/application/occurrence-payment/unlink-occurrence-payment.usecase.ts';

export class UnlinkOccurrencePaymentController {
  private readonly unlinkOccurrencePayment: UnlinkOccurrencePaymentUseCase;

  constructor(unlinkOccurrencePayment: UnlinkOccurrencePaymentUseCase) {
    this.unlinkOccurrencePayment = unlinkOccurrencePayment;
  }

  async handle(request: UnlinkOccurrencePaymentController.Request): Promise<void> {
    await this.unlinkOccurrencePayment.execute(request.params);
  }
}

export namespace UnlinkOccurrencePaymentController {
  export type Request = { params: UnlinkOccurrencePaymentUseCase.Input };
}
