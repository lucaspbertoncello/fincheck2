import type { ArchiveTagUseCase } from '#/modules/categories/application/tag/archive-tag.usecase.ts';

export class ArchiveTagController {
  private readonly archiveTag: ArchiveTagUseCase;

  constructor(archiveTag: ArchiveTagUseCase) {
    this.archiveTag = archiveTag;
  }

  async handle(request: ArchiveTagController.Request): Promise<ArchiveTagController.Response> {
    return this.archiveTag.execute({ tagId: request.params.id });
  }
}

export namespace ArchiveTagController {
  export type Request = { params: { id: string } };
  export type Response = ArchiveTagUseCase.Output;
}
