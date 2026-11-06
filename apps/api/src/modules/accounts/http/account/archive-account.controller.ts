import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';

import type { ArchiveAccountUseCase } from '#/modules/accounts/application/account/archive-account.usecase.ts';

export class ArchiveAccountController {
  private readonly archiveAccount: ArchiveAccountUseCase;

  constructor(archiveAccount: ArchiveAccountUseCase) {
    this.archiveAccount = archiveAccount;
  }

  async handle(
    request: ArchiveAccountController.Request,
  ): Promise<ArchiveAccountController.Response> {
    return this.archiveAccount.execute({ accountId: request.params.id });
  }
}

export namespace ArchiveAccountController {
  export type Request = { params: { id: string } };
  export type Response = Account.Dto;
}
