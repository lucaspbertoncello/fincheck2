import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

import avatar01 from '#/shared/assets/avatars/notionists-01.svg';
import avatar02 from '#/shared/assets/avatars/notionists-02.svg';
import avatar03 from '#/shared/assets/avatars/notionists-03.svg';
import avatar04 from '#/shared/assets/avatars/notionists-04.svg';
import avatar05 from '#/shared/assets/avatars/notionists-05.svg';
import avatar06 from '#/shared/assets/avatars/notionists-06.svg';
import avatar07 from '#/shared/assets/avatars/notionists-07.svg';
import avatar08 from '#/shared/assets/avatars/notionists-08.svg';
import avatar09 from '#/shared/assets/avatars/notionists-09.svg';
import avatar10 from '#/shared/assets/avatars/notionists-10.svg';
import avatar11 from '#/shared/assets/avatars/notionists-11.svg';
import avatar12 from '#/shared/assets/avatars/notionists-12.svg';

/** The art of each illustrated avatar (Notionists, CC0): the URL Vite gives the SVG. */
export const PROFILE_AVATAR_IMAGE: Record<Profile.AvatarId, string> = {
  'notionists-01': avatar01,
  'notionists-02': avatar02,
  'notionists-03': avatar03,
  'notionists-04': avatar04,
  'notionists-05': avatar05,
  'notionists-06': avatar06,
  'notionists-07': avatar07,
  'notionists-08': avatar08,
  'notionists-09': avatar09,
  'notionists-10': avatar10,
  'notionists-11': avatar11,
  'notionists-12': avatar12,
};
