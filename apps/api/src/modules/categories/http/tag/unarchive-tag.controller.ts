import type { UnarchiveTagUseCase } from '#/modules/categories/application/tag/unarchive-tag.usecase.ts';

export class UnarchiveTagController {
  private readonly unarchiveTag: UnarchiveTagUseCase;

  constructor(unarchiveTag: UnarchiveTagUseCase) {
    this.unarchiveTag = unarchiveTag;
  }

  async handle(request: UnarchiveTagController.Request): Promise<UnarchiveTagController.Response> {
    return this.unarchiveTag.execute({ tagId: request.params.id });
  }
}

export namespace UnarchiveTagController {
  export type Request = { params: { id: string } };
  export type Response = UnarchiveTagUseCase.Output;
}
