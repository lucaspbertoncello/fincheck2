import type { Occurrence as OccurrenceContract } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';

import type { LinkOccurrencePaymentUseCase } from '#/modules/recurrences/application/occurrence-payment/link-occurrence-payment.usecase.ts';

export class LinkOccurrencePaymentController {
  private readonly linkOccurrencePayment: LinkOccurrencePaymentUseCase;

  constructor(linkOccurrencePayment: LinkOccurrencePaymentUseCase) {
    this.linkOccurrencePayment = linkOccurrencePayment;
  }

  async handle(
    request: LinkOccurrencePaymentController.Request,
  ): Promise<LinkOccurrencePaymentController.Response> {
    return this.linkOccurrencePayment.execute({ ...request.params, ...request.body });
  }
}

export namespace LinkOccurrencePaymentController {
  export type Request = {
    params: OccurrenceContract.Params;
    body: OccurrenceContract.LinkPaymentRequest;
  };
  export type Response = LinkOccurrencePaymentUseCase.Output;
}
