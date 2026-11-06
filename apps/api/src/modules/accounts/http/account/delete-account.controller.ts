import type { DeleteAccountUseCase } from '#/modules/accounts/application/account/delete-account.usecase.ts';

export class DeleteAccountController {
  private readonly deleteAccount: DeleteAccountUseCase;

  constructor(deleteAccount: DeleteAccountUseCase) {
    this.deleteAccount = deleteAccount;
  }

  async handle(request: DeleteAccountController.Request): Promise<void> {
    await this.deleteAccount.execute({ accountId: request.params.id });
  }
}

export namespace DeleteAccountController {
  export type Request = { params: { id: string } };
}
