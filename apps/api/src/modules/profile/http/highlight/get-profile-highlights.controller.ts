import type { GetProfileHighlightsQuery } from '#/modules/profile/application/highlight/get-profile-highlights.query.ts';

export class GetProfileHighlightsController {
  private readonly getProfileHighlights: GetProfileHighlightsQuery;

  constructor(getProfileHighlights: GetProfileHighlightsQuery) {
    this.getProfileHighlights = getProfileHighlights;
  }

  async handle(): Promise<GetProfileHighlightsController.Response> {
    return this.getProfileHighlights.execute();
  }
}

export namespace GetProfileHighlightsController {
  export type Response = GetProfileHighlightsQuery.Output;
}
