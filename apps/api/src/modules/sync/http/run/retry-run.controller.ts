import type { RetryRunUseCase } from '#/modules/sync/application/run/retry-run.usecase.ts';

export class RetryRunController {
  private readonly retryRun: RetryRunUseCase;

  constructor(retryRun: RetryRunUseCase) {
    this.retryRun = retryRun;
  }

  async handle(request: RetryRunController.Request): Promise<RetryRunController.Response> {
    return this.retryRun.run({ connectionId: request.params.id });
  }
}

export namespace RetryRunController {
  export type Request = { params: { id: string } };
  export type Response = RetryRunUseCase.Output;
}
