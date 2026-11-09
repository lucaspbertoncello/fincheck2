import type { Profile as ProfileContract } from '@fincheck/shared/profile/profile/profile.type.ts';

import { buildIncomeSummary } from '#/modules/profile/application/profile/build-income-summary.util.ts';
import type { ProfileIncomeSourceReader } from '#/modules/profile/application/profile/profile-income-source-reader.interface.ts';
import type { Profile } from '#/modules/profile/domain/profile/profile.entity.ts';

// The `Profile.Dto` of the contract: the saved data plus the income read from the recurrences.
export class ProfileDtoBuilder {
  private readonly incomeSources: ProfileIncomeSourceReader;

  constructor(incomeSources: ProfileIncomeSourceReader) {
    this.incomeSources = incomeSources;
  }

  async build(profile: Profile): Promise<ProfileContract.Dto> {
    return {
      name: profile.name,
      initials: profile.initials,
      avatarId: profile.avatarId,
      income: buildIncomeSummary(await this.incomeSources.listIncomeSources()),
      updatedAt: profile.updatedAt,
    };
  }
}
