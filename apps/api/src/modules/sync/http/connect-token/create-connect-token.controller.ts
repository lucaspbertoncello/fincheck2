import type { ConnectToken } from '@fincheck/shared/sync/connect-token/connect-token.type.ts';

import type { CreateConnectTokenUseCase } from '#/modules/sync/application/connection/create-connect-token.usecase.ts';

export class CreateConnectTokenController {
  private readonly createConnectToken: CreateConnectTokenUseCase;

  constructor(createConnectToken: CreateConnectTokenUseCase) {
    this.createConnectToken = createConnectToken;
  }

  async handle(): Promise<CreateConnectTokenController.Response> {
    return this.createConnectToken.execute();
  }
}

export namespace CreateConnectTokenController {
  export type Response = ConnectToken.Dto;
}
