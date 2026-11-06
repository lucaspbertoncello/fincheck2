import { Banner, ContentSkeleton, FormModal } from '@fincheck/ui';

type RecurrenceFormStatusModalProps = {
  /** "loading" while the recurrence being edited arrives; "error" when it did not. */
  state: 'loading' | 'error';
  onClose: () => void;
};

/** The edit modal before it has data: a skeleton, or the error with a way out. */
export function RecurrenceFormStatusModal({ state, onClose }: RecurrenceFormStatusModalProps) {
  return (
    <FormModal
      isOpen
      onOpenChange={(open) => !open && onClose()}
      title="Editar recorrência"
      description={state === 'loading' ? 'Abrindo a recorrência...' : undefined}
      submitLabel="Salvar alterações"
      submitDisabled
      submitHint={state === 'loading' ? 'Espere a recorrência abrir.' : undefined}
      onSubmit={onClose}
      cancelLabel="Fechar"
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
    </FormModal>
  );
}
