import { deriveInitials } from '@fincheck/shared/profile/profile/derive-initials.util.ts';
import { updateProfileRequestSchema } from '@fincheck/shared/profile/profile/profile.schema.ts';
import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';
import { useState } from 'react';

import { useProfileEditModel } from '#/features/profile/profile/profile-edit/profile-edit.model.ts';
import { ProfileEditView } from '#/features/profile/profile/profile-edit/profile-edit.view.tsx';

type ProfileEditViewModelProps = {
  profile: Profile.Dto;
  onClose: () => void;
};

/** Edits the name, the initials and the avatar; the initials stay empty (derived by the API) unless they were changed. */
export function ProfileEditViewModel({ profile, onClose }: ProfileEditViewModelProps) {
  const { update } = useProfileEditModel();
  const [name, setName] = useState(profile.name);
  const [initials, setInitials] = useState(
    profile.initials === deriveInitials(profile.name) ? '' : profile.initials,
  );
  const [avatarId, setAvatarId] = useState<Profile.AvatarId | null>(profile.avatarId);
  const [errors, setErrors] = useState<{ name?: string; initials?: string }>({});
  const [submitError, setSubmitError] = useState<string>();

  const previewInitials = initials.trim()
    ? initials.trim().toLocaleUpperCase('pt-BR')
    : deriveInitials(name);

  function submit() {
    const typed = initials.trim();
    const parsed = updateProfileRequestSchema.safeParse({
      name,
      ...(typed ? { initials: typed } : {}),
      avatarId,
    });
    if (!parsed.success) {
      const fields = parsed.error.issues.map((issue) => issue.path[0]);
      setErrors({
        name: fields.includes('name') ? 'Escreva como quer ser chamado' : undefined,
        initials: fields.includes('initials') ? 'Use de 1 a 3 letras' : undefined,
      });
      return;
    }
    setErrors({});
    setSubmitError(undefined);
    update.mutate(parsed.data, {
      onSuccess: onClose,
      onError: () => setSubmitError('Não deu para salvar. Tente de novo.'),
    });
  }

  return (
    <ProfileEditView
      name={name}
      initials={initials}
      avatarId={avatarId}
      previewInitials={previewInitials}
      nameError={errors.name}
      initialsError={errors.initials}
      submitError={submitError}
      isSubmitting={update.isPending}
      onNameChange={(value) => {
        setName(value);
        setErrors((current) => ({ ...current, name: undefined }));
      }}
      onInitialsChange={(value) => {
        setInitials(value);
        setErrors((current) => ({ ...current, initials: undefined }));
      }}
      onAvatarChange={setAvatarId}
      onSubmit={submit}
      onClose={onClose}
    />
  );
}
