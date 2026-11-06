import type { CreateTagUseCase } from '#/modules/categories/application/tag/create-tag.usecase.ts';

export class CreateTagController {
  private readonly createTag: CreateTagUseCase;

  constructor(createTag: CreateTagUseCase) {
    this.createTag = createTag;
  }

  async handle(request: CreateTagController.Request): Promise<CreateTagController.Response> {
    return this.createTag.execute(request.body);
  }
}

export namespace CreateTagController {
  export type Request = { body: CreateTagUseCase.Input };
  export type Response = CreateTagUseCase.Output;
}
