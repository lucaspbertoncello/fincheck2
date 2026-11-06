import type { RestoreOriginalUseCase } from '#/modules/transactions/application/transaction/restore-original.usecase.ts';

export class RestoreOriginalController {
  private readonly restoreOriginal: RestoreOriginalUseCase;

  constructor(restoreOriginal: RestoreOriginalUseCase) {
    this.restoreOriginal = restoreOriginal;
  }

  async handle(
    request: RestoreOriginalController.Request,
  ): Promise<RestoreOriginalController.Response> {
    return this.restoreOriginal.execute({ id: request.params.id });
  }
}

export namespace RestoreOriginalController {
  export type Request = { params: { id: string } };
  export type Response = RestoreOriginalUseCase.Output;
}
