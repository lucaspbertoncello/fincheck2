import { FormModal, FormModalGroup, TextField } from '@fincheck/ui';

import { ProfileAvatar } from '#/features/settings/settings/profile/components/profile-avatar.component.tsx';

type ProfileEditViewProps = {
  name: string;
  initials: string;
  /** What the avatar shows now (the typed initials, or the ones derived from the name). */
  previewInitials: string;
  nameError?: string;
  initialsError?: string;
  submitError?: string;
  isSubmitting: boolean;
  onNameChange: (value: string) => void;
  onInitialsChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

/** "Editar perfil": the name and, if wanted, the letters of the avatar, with the avatar live. */
export function ProfileEditView({
  name,
  initials,
  previewInitials,
  nameError,
  initialsError,
  submitError,
  isSubmitting,
  onNameChange,
  onInitialsChange,
  onSubmit,
  onClose,
}: ProfileEditViewProps) {
  return (
    <FormModal
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="default"
      title="Editar perfil"
      description="Como você aparece no app."
      submitLabel="Salvar"
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      error={submitError}
    >
      <FormModalGroup>
        <div className="flex items-center gap-s16">
          <ProfileAvatar initials={previewInitials} size="md" />
          <TextField
            label="Nome"
            value={name}
            onChange={onNameChange}
            error={nameError}
            maxLength={60}
            autoComplete="off"
            isRequired
            className="flex-1"
          />
        </div>
        <TextField
          label="Iniciais do avatar"
          value={initials}
          onChange={onInitialsChange}
          error={initialsError}
          description="Opcional. Em branco, o app usa as letras do nome."
          maxLength={3}
          autoComplete="off"
        />
      </FormModalGroup>
    </FormModal>
  );
}
