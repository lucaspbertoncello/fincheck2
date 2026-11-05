export type FolderModalProps = {
  isEditing: boolean;
  draft: string;
  error: string | null;
  isSaving: boolean;
  onStartEditing: () => void;
  onDraftChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};
