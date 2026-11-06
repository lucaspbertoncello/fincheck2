import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';

import type { GetAccountUseCase } from '#/modules/accounts/application/account/get-account.usecase.ts';

export class GetAccountController {
  private readonly getAccount: GetAccountUseCase;

  constructor(getAccount: GetAccountUseCase) {
    this.getAccount = getAccount;
  }

  async handle(request: GetAccountController.Request): Promise<GetAccountController.Response> {
    return this.getAccount.execute({ accountId: request.params.id });
  }
}

export namespace GetAccountController {
  export type Request = { params: { id: string } };
  export type Response = Account.Dto;
}
