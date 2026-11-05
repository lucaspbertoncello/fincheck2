type ProfileAvatarProps = {
  initials: string;
  /** "lg" is the profile header; "md" is the preview inside the edit modal. */
  size?: 'md' | 'lg';
};

/** The avatar: the initials in the brand gradient, the same fill as the primary button. */
export function ProfileAvatar({ initials, size = 'lg' }: ProfileAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-capsule bg-(image:--gradient-button) font-title font-heading text-fg-on-accent shadow-(--shadow-button-inset) ${
        size === 'lg' ? 'size-16 text-money-md' : 'size-12 text-money-sm'
      }`}
    >
      {initials}
    </span>
  );
}
