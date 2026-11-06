import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';

import type { CreateAccountUseCase } from '#/modules/accounts/application/account/create-account.usecase.ts';

export class CreateAccountController {
  private readonly createAccount: CreateAccountUseCase;

  constructor(createAccount: CreateAccountUseCase) {
    this.createAccount = createAccount;
  }

  async handle(
    request: CreateAccountController.Request,
  ): Promise<CreateAccountController.Response> {
    return this.createAccount.execute(request.body);
  }
}

export namespace CreateAccountController {
  export type Request = { body: Account.CreateRequest };
  export type Response = Account.Dto;
}
