import type { Profile as ProfileContract } from '@fincheck/shared/profile/profile/profile.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { ProfileDtoBuilder } from '#/modules/profile/application/profile/profile-dto-builder.service.ts';
import { Profile } from '#/modules/profile/domain/profile/profile.entity.ts';
import type { ProfileRepository } from '#/modules/profile/domain/profile/profile-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Salvar" the name, the initials and the avatar (BR-PRF-001). The answer is the whole profile,
// with the income, so the screen needs no other read.
export class UpdateProfileUseCase {
  private readonly profiles: ProfileRepository<Kysely<Database>>;
  private readonly builder: ProfileDtoBuilder;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;

  constructor(
    profiles: ProfileRepository<Kysely<Database>>,
    builder: ProfileDtoBuilder,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
  ) {
    this.profiles = profiles;
    this.builder = builder;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: UpdateProfileUseCase.Input): Promise<UpdateProfileUseCase.Output> {
    const now = this.clock.now();
    const profile = await this.unitOfWork.run(async (executor) => {
      const current = (await this.profiles.find(executor)) ?? Profile.placeholder(now);
      current.edit(input, now);
      await this.profiles.save(current, executor);

      return current;
    });

    return this.builder.build(profile);
  }
}

export namespace UpdateProfileUseCase {
  export type Input = ProfileContract.UpdateRequest;
  export type Output = ProfileContract.Dto;
}
