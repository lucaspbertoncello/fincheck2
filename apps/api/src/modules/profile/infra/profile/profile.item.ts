import { profileAvatarIdSchema } from '@fincheck/shared/profile/profile/profile.schema.ts';
import type { Insertable, Selectable } from 'kysely';

import type { ProfileTable } from '#/database/tables/profile/profile-table.type.ts';
import { Profile } from '#/modules/profile/domain/profile/profile.entity.ts';

// The aggregate as the one row of `profile` (`id = 1`).
export class ProfileItem {
  static fromEntity(profile: Profile): Insertable<ProfileTable> {
    return {
      id: 1,
      name: profile.name,
      initials: profile.initials,
      avatar_id: profile.avatarId,
      updated_at: profile.updatedAt,
    };
  }

  static toDomain(row: Selectable<ProfileTable>): Profile {
    // The list of avatars lives in `shared` and may lose one: an id it no longer knows reads as
    // "no avatar" (the initials) instead of breaking the read.
    const avatarId = profileAvatarIdSchema.safeParse(row.avatar_id);

    return new Profile({
      name: row.name,
      initials: row.initials,
      avatarId: avatarId.success ? avatarId.data : null,
      updatedAt: row.updated_at,
    });
  }
}
