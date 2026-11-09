import type { Connection } from '@fincheck/shared/sync/connection/connection.type.ts';

import type { RegisterConnectionUseCase } from '#/modules/sync/application/connection/register-connection.usecase.ts';

export class RegisterConnectionController {
  private readonly registerConnection: RegisterConnectionUseCase;

  constructor(registerConnection: RegisterConnectionUseCase) {
    this.registerConnection = registerConnection;
  }

  async handle(
    request: RegisterConnectionController.Request,
  ): Promise<RegisterConnectionController.Response> {
    return this.registerConnection.register(request.body);
  }
}

export namespace RegisterConnectionController {
  export type Request = { body: Connection.CreateRequest };
  export type Response = Connection.Dto;
}
