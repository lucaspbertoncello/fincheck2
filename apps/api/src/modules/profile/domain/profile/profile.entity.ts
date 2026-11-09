import { deriveInitials } from '@fincheck/shared/profile/profile/derive-initials.util.ts';
import { PROFILE_INITIALS_LIMITS } from '@fincheck/shared/profile/profile/profile.constant.ts';
import type { Profile as ProfileContract } from '@fincheck/shared/profile/profile/profile.type.ts';

const PLACEHOLDER_NAME = 'Você';
const PLACEHOLDER_INITIALS = 'V';

// The profile of the user: how he wants to be called, the initials of the avatar and the
// illustrated avatar he may pick instead (BR-PRF-001). One user, so one record. The sources of
// income are not here: each one IS an income recurrence (BR-PRF-002).
export class Profile {
  name: string;
  initials: string;
  avatarId: ProfileContract.AvatarId | null;
  updatedAt: string;

  constructor(attr: Profile.Attributes) {
    this.name = attr.name;
    this.initials = attr.initials;
    this.avatarId = attr.avatarId;
    this.updatedAt = attr.updatedAt;
  }

  // What the first opening shows when nothing was saved yet, so the screen never fails.
  static placeholder(now: string): Profile {
    return new Profile({
      name: PLACEHOLDER_NAME,
      initials: PLACEHOLDER_INITIALS,
      avatarId: null,
      updatedAt: now,
    });
  }

  // "Salvar". Initials left out are derived from the name; they are always kept in capitals. An
  // avatar left out (`undefined`) stays; `null` goes back to the initials.
  edit(input: Profile.EditInput, now: string): void {
    const name = input.name.trim();

    this.name = name;
    // Capitals can be longer than the letters typed ("ß" becomes "SS"): cut to the limit.
    this.initials = (input.initials ?? deriveInitials(name))
      .toLocaleUpperCase('pt-BR')
      .slice(0, PROFILE_INITIALS_LIMITS.max);
    if (input.avatarId !== undefined) this.avatarId = input.avatarId;
    this.updatedAt = now;
  }
}

export namespace Profile {
  export type Attributes = {
    name: string;
    initials: string;
    avatarId: ProfileContract.AvatarId | null;
    updatedAt: string;
  };

  export type EditInput = {
    name: string;
    initials?: string | undefined;
    avatarId?: ProfileContract.AvatarId | null | undefined;
  };
}
