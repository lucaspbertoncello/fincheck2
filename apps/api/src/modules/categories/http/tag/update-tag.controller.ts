import type { UpdateTagUseCase } from '#/modules/categories/application/tag/update-tag.usecase.ts';

export class UpdateTagController {
  private readonly updateTag: UpdateTagUseCase;

  constructor(updateTag: UpdateTagUseCase) {
    this.updateTag = updateTag;
  }

  async handle(request: UpdateTagController.Request): Promise<UpdateTagController.Response> {
    return this.updateTag.execute({ tagId: request.params.id, body: request.body });
  }
}

export namespace UpdateTagController {
  export type Request = { params: { id: string }; body: UpdateTagUseCase.Input['body'] };
  export type Response = UpdateTagUseCase.Output;
}
