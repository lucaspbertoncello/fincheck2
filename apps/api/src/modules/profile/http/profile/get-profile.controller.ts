import type { GetProfileQuery } from '#/modules/profile/application/profile/get-profile.query.ts';

export class GetProfileController {
  private readonly getProfile: GetProfileQuery;

  constructor(getProfile: GetProfileQuery) {
    this.getProfile = getProfile;
  }

  async handle(): Promise<GetProfileController.Response> {
    return this.getProfile.execute();
  }
}

export namespace GetProfileController {
  export type Response = GetProfileQuery.Output;
}
