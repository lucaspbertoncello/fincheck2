import type { UpdateProfileUseCase } from '#/modules/profile/application/profile/update-profile.usecase.ts';

export class UpdateProfileController {
  private readonly updateProfile: UpdateProfileUseCase;

  constructor(updateProfile: UpdateProfileUseCase) {
    this.updateProfile = updateProfile;
  }

  async handle(
    request: UpdateProfileController.Request,
  ): Promise<UpdateProfileController.Response> {
    return this.updateProfile.execute(request.body);
  }
}

export namespace UpdateProfileController {
  export type Request = { body: UpdateProfileUseCase.Input };
  export type Response = UpdateProfileUseCase.Output;
}
