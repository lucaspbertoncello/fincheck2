import type { ListTagsQuery } from '#/modules/categories/application/tag/list-tags.query.ts';

export class ListTagsController {
  private readonly listTags: ListTagsQuery;

  constructor(listTags: ListTagsQuery) {
    this.listTags = listTags;
  }

  async handle(request: ListTagsController.Request): Promise<ListTagsController.Response> {
    return this.listTags.execute(request.query);
  }
}

export namespace ListTagsController {
  export type Request = { query: ListTagsQuery.Input };
  export type Response = ListTagsQuery.Output;
}
