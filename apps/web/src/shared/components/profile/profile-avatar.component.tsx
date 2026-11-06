import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

import { PROFILE_AVATAR_IMAGE } from '#/shared/constants/profile/profile-avatar-image.constant.ts';

type ProfileAvatarProps = {
  initials: string;
  /** The illustrated avatar chosen; null (or left out) shows the initials. */
  avatarId?: Profile.AvatarId | null;
  /** "lg" is the profile header; "xl" the preview of the edit modal; "fill" takes the width of its cell (a choice in a grid). */
  size?: 'lg' | 'xl' | 'fill';
};

const SIZE_CLASS = {
  lg: 'size-16 text-money-md',
  xl: 'size-24 text-money-lg',
  fill: 'aspect-square w-full text-label',
} as const satisfies Record<NonNullable<ProfileAvatarProps['size']>, string>;

/**
 * The avatar of the user (BR-PRF-001): the illustration in a circle, or the initials in the brand
 * gradient, the same fill as the primary button. The art is black line work with no ground: the
 * circle is the subtle surface in the light theme and the light text tone in the dark one, so the
 * lines read in both.
 */
export function ProfileAvatar({ initials, avatarId = null, size = 'lg' }: ProfileAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center overflow-hidden rounded-capsule font-title font-heading ${SIZE_CLASS[size]} ${
        avatarId
          ? 'bg-subtle dark:bg-fg-primary'
          : 'bg-(image:--gradient-button) text-fg-on-accent shadow-(--shadow-button-inset)'
      }`}
    >
      {avatarId ? (
        <img
          src={PROFILE_AVATAR_IMAGE[avatarId]}
          alt=""
          draggable={false}
          className="size-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}
