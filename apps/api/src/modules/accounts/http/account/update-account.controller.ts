import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';

import type { UpdateAccountUseCase } from '#/modules/accounts/application/account/update-account.usecase.ts';

export class UpdateAccountController {
  private readonly updateAccount: UpdateAccountUseCase;

  constructor(updateAccount: UpdateAccountUseCase) {
    this.updateAccount = updateAccount;
  }

  async handle(
    request: UpdateAccountController.Request,
  ): Promise<UpdateAccountController.Response> {
    return this.updateAccount.execute({ accountId: request.params.id, changes: request.body });
  }
}

export namespace UpdateAccountController {
  export type Request = { params: { id: string }; body: Account.UpdateRequest };
  export type Response = Account.Dto;
}
