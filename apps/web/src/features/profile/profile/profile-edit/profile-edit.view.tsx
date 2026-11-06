import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';
import { FormModal, TextField } from '@fincheck/ui';

import { ProfileAvatarChoice } from '#/features/profile/profile/components/profile-avatar-choice.component.tsx';
import { ProfileAvatar } from '#/shared/components/profile/profile-avatar.component.tsx';

type ProfileEditViewProps = {
  name: string;
  initials: string;
  avatarId: Profile.AvatarId | null;
  /** What the avatar shows now (the typed initials, or the ones derived from the name). */
  previewInitials: string;
  nameError?: string;
  initialsError?: string;
  submitError?: string;
  isSubmitting: boolean;
  onNameChange: (value: string) => void;
  onInitialsChange: (value: string) => void;
  onAvatarChange: (value: Profile.AvatarId | null) => void;
  onSubmit: () => void;
  onClose: () => void;
};

/** "Editar perfil": the avatar live on top, the name and the letters under it, then the choice of avatar. */
export function ProfileEditView({
  name,
  initials,
  avatarId,
  previewInitials,
  nameError,
  initialsError,
  submitError,
  isSubmitting,
  onNameChange,
  onInitialsChange,
  onAvatarChange,
  onSubmit,
  onClose,
}: ProfileEditViewProps) {
  return (
    <FormModal
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="wide"
      title="Editar perfil"
      description="Como você aparece no app."
      submitLabel="Salvar"
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      error={submitError}
    >
      <div className="flex justify-center">
        <ProfileAvatar initials={previewInitials} avatarId={avatarId} size="xl" />
      </div>
      <div className="grid grid-cols-[1fr_7rem] gap-s12">
        <TextField
          label="Nome"
          value={name}
          onChange={onNameChange}
          error={nameError}
          maxLength={60}
          autoComplete="off"
          isRequired
        />
        <TextField
          label="Iniciais"
          value={initials}
          onChange={onInitialsChange}
          error={initialsError}
          placeholder={previewInitials}
          maxLength={3}
          autoComplete="off"
        />
      </div>
      <ProfileAvatarChoice value={avatarId} initials={previewInitials} onChange={onAvatarChange} />
    </FormModal>
  );
}
