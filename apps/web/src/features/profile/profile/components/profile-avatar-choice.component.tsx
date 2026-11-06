import { PROFILE_AVATAR_IDS } from '@fincheck/shared/profile/profile/profile.constant.ts';
import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';
import { Label, Radio, RadioGroup } from 'react-aria-components';

import { ProfileAvatar } from '#/shared/components/profile/profile-avatar.component.tsx';

const INITIALS_KEY = 'initials';

type ProfileAvatarChoiceProps = {
  /** The avatar chosen; null is "Usar iniciais". */
  value: Profile.AvatarId | null;
  /** What the first option writes in its circle. */
  initials: string;
  onChange: (value: Profile.AvatarId | null) => void;
};

/**
 * The avatar picker: "Usar iniciais" first, then the 12 illustrations, seven to a row (two rows).
 * Radio semantics (arrows move the choice). The chosen one takes the weak accent fill and the accent
 * border, like the other choices of the app; the border width never changes, so nothing shifts.
 */
export function ProfileAvatarChoice({ value, initials, onChange }: ProfileAvatarChoiceProps) {
  const options = [null, ...PROFILE_AVATAR_IDS] as const;

  return (
    <RadioGroup
      value={value ?? INITIALS_KEY}
      onChange={(next) => onChange(next === INITIALS_KEY ? null : (next as Profile.AvatarId))}
      className="flex flex-col gap-s4"
    >
      <Label className="text-label text-fg-secondary">Avatar</Label>
      <div className="grid grid-cols-7 gap-s8">
        {options.map((option, index) => (
          <Radio
            key={option ?? INITIALS_KEY}
            value={option ?? INITIALS_KEY}
            aria-label={option === null ? 'Usar iniciais' : `Avatar ${index}`}
            className="focus-ring aspect-square w-full max-w-14 cursor-pointer justify-self-center rounded-capsule border border-line p-s4 transition-[transform,background-color,border-color] duration-(--duration-fast) ease-(--ease-standard) data-[hovered]:bg-subtle data-[pressed]:scale-96 data-[selected]:border-brand data-[selected]:bg-brand-weak"
          >
            <ProfileAvatar initials={initials} avatarId={option} size="fill" />
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}
