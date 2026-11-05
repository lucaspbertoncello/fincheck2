import { useUpdateProfile } from '#/domain/profile/profile/hooks/use-update-profile.hook.ts';

/** The save of the profile name and initials. */
export function useProfileEditModel() {
  return { update: useUpdateProfile() };
}
