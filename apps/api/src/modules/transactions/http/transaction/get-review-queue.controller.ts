import type { GetReviewQueueQuery } from '#/modules/transactions/application/transaction/get-review-queue.query.ts';

export class GetReviewQueueController {
  private readonly getReviewQueue: GetReviewQueueQuery;

  constructor(getReviewQueue: GetReviewQueueQuery) {
    this.getReviewQueue = getReviewQueue;
  }

  async handle(
    request: GetReviewQueueController.Request,
  ): Promise<GetReviewQueueController.Response> {
    return this.getReviewQueue.execute(request.query);
  }
}

export namespace GetReviewQueueController {
  export type Request = { query: GetReviewQueueQuery.Input };
  export type Response = GetReviewQueueQuery.Output;
}
