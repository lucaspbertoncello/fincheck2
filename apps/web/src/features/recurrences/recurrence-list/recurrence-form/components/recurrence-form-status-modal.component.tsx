import { Banner, Button, ContentSkeleton, Modal } from '@fincheck/ui';

type RecurrenceFormStatusModalProps = {
  /** "loading" while the recurrence being edited arrives; "error" when it did not. */
  state: 'loading' | 'error';
  onClose: () => void;
};

/** The edit modal before it has data: a skeleton, or the error with a way out. */
export function RecurrenceFormStatusModal({ state, onClose }: RecurrenceFormStatusModalProps) {
  return (
    <Modal
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title="Editar recorrência"
      size="wide"
      actions={
        <Button variant="secondary" onPress={onClose}>
          Fechar
        </Button>
      }
    >
      {state === 'loading' ? (
        <ContentSkeleton variant="sections" />
      ) : (
        <Banner
          variant="error"
          title="Não deu para abrir esta recorrência"
          description="Ela pode ter sido excluída. Feche e confira a lista."
        />
      )}
    </Modal>
  );
}
