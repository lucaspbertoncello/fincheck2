import type { DisconnectConnectionUseCase } from '#/modules/sync/application/connection/disconnect-connection.usecase.ts';

export class DisconnectConnectionController {
  private readonly disconnectConnection: DisconnectConnectionUseCase;

  constructor(disconnectConnection: DisconnectConnectionUseCase) {
    this.disconnectConnection = disconnectConnection;
  }

  async handle(request: DisconnectConnectionController.Request): Promise<void> {
    await this.disconnectConnection.execute({ connectionId: request.params.id });
  }
}

export namespace DisconnectConnectionController {
  export type Request = { params: { id: string } };
}
