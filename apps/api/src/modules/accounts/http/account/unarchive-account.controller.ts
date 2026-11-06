import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';

import type { UnarchiveAccountUseCase } from '#/modules/accounts/application/account/unarchive-account.usecase.ts';

export class UnarchiveAccountController {
  private readonly unarchiveAccount: UnarchiveAccountUseCase;

  constructor(unarchiveAccount: UnarchiveAccountUseCase) {
    this.unarchiveAccount = unarchiveAccount;
  }

  async handle(
    request: UnarchiveAccountController.Request,
  ): Promise<UnarchiveAccountController.Response> {
    return this.unarchiveAccount.execute({ accountId: request.params.id });
  }
}

export namespace UnarchiveAccountController {
  export type Request = { params: { id: string } };
  export type Response = Account.Dto;
}
