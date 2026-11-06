import type { DeletionImpact } from '@fincheck/shared/accounts/deletion-impact/deletion-impact.type.ts';

import type { GetDeletionImpactUseCase } from '#/modules/accounts/application/account/get-deletion-impact.usecase.ts';

export class GetDeletionImpactController {
  private readonly getDeletionImpact: GetDeletionImpactUseCase;

  constructor(getDeletionImpact: GetDeletionImpactUseCase) {
    this.getDeletionImpact = getDeletionImpact;
  }

  async handle(
    request: GetDeletionImpactController.Request,
  ): Promise<GetDeletionImpactController.Response> {
    return this.getDeletionImpact.execute({ accountId: request.params.id });
  }
}

export namespace GetDeletionImpactController {
  export type Request = { params: { id: string } };
  export type Response = DeletionImpact.Dto;
}
