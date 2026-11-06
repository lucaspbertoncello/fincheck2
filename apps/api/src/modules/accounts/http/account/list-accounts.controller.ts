import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';

import type { ListAccountsUseCase } from '#/modules/accounts/application/account/list-accounts.usecase.ts';

export class ListAccountsController {
  private readonly listAccounts: ListAccountsUseCase;

  constructor(listAccounts: ListAccountsUseCase) {
    this.listAccounts = listAccounts;
  }

  async handle(request: ListAccountsController.Request): Promise<ListAccountsController.Response> {
    return this.listAccounts.execute(request.query);
  }
}

export namespace ListAccountsController {
  export type Request = { query: Account.ListQuery };
  export type Response = { items: Account.Dto[] };
}
