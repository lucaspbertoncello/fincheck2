import type { ResolveBankChangeUseCase } from '#/modules/transactions/application/transaction/resolve-bank-change.usecase.ts';

export class ResolveBankChangeController {
  private readonly resolveBankChange: ResolveBankChangeUseCase;

  constructor(resolveBankChange: ResolveBankChangeUseCase) {
    this.resolveBankChange = resolveBankChange;
  }

  async handle(
    request: ResolveBankChangeController.Request,
  ): Promise<ResolveBankChangeController.Response> {
    return this.resolveBankChange.execute({ id: request.params.id, ...request.body });
  }
}

export namespace ResolveBankChangeController {
  export type Request = {
    params: { id: string };
    body: Omit<ResolveBankChangeUseCase.Input, 'id'>;
  };
  export type Response = ResolveBankChangeUseCase.Output;
}
