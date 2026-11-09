import type { Profile as ProfileContract } from '@fincheck/shared/profile/profile/profile.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { ProfileDtoBuilder } from '#/modules/profile/application/profile/profile-dto-builder.service.ts';
import { Profile } from '#/modules/profile/domain/profile/profile.entity.ts';
import type { ProfileRepository } from '#/modules/profile/domain/profile/profile-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// "Perfil" (RF-PRF-001, 002): the saved name, initials and avatar, and the income. With nothing
// saved it answers "Você" / "V", so the first opening does not fail.
export class GetProfileQuery {
  private readonly profiles: ProfileRepository<Kysely<Database>>;
  private readonly builder: ProfileDtoBuilder;
  private readonly clock: Clock;

  constructor(
    profiles: ProfileRepository<Kysely<Database>>,
    builder: ProfileDtoBuilder,
    clock: Clock,
  ) {
    this.profiles = profiles;
    this.builder = builder;
    this.clock = clock;
  }

  async execute(): Promise<GetProfileQuery.Output> {
    const profile = (await this.profiles.find()) ?? Profile.placeholder(this.clock.now());

    return this.builder.build(profile);
  }
}

export namespace GetProfileQuery {
  export type Output = ProfileContract.Dto;
}
