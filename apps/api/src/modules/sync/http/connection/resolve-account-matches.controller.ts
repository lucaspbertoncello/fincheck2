import type { Connection } from '@fincheck/shared/sync/connection/connection.type.ts';

import type { ResolveAccountMatchesUseCase } from '#/modules/sync/application/connection/resolve-account-matches.usecase.ts';

export class ResolveAccountMatchesController {
  private readonly resolveMatches: ResolveAccountMatchesUseCase;

  constructor(resolveMatches: ResolveAccountMatchesUseCase) {
    this.resolveMatches = resolveMatches;
  }

  async handle(
    request: ResolveAccountMatchesController.Request,
  ): Promise<ResolveAccountMatchesController.Response> {
    return this.resolveMatches.resolve({
      connectionId: request.params.id,
      matches: request.body.matches,
    });
  }
}

export namespace ResolveAccountMatchesController {
  export type Request = { params: { id: string }; body: Connection.ResolveMatchesRequest };
  export type Response = Connection.Dto;
}
