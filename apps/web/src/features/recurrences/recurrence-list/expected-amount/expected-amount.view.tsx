import { AmountField, FineNote, FormModal } from '@fincheck/ui';

type ExpectedAmountViewProps = {
  name: string;
  kind: 'income' | 'expense';
  /** "só em outubro". */
  scopeLabel: string;
  cents: number;
  onChange: (cents: number) => void;
  error?: string;
  formError: string | null;
  saving: boolean;
  onSubmit: () => void;
  onClose: () => void;
};

/** "Editar valor esperado": the new amount of this month only; the recurrence does not change. */
export function ExpectedAmountView({
  name,
  kind,
  scopeLabel,
  cents,
  onChange,
  error,
  formError,
  saving,
  onSubmit,
  onClose,
}: ExpectedAmountViewProps) {
  return (
    <FormModal
      isOpen
      onOpenChange={(open) => !open && onClose()}
      size="default"
      title="Editar valor esperado"
      description={`${name}, ${scopeLabel}`}
      submitLabel="Salvar valor"
      onSubmit={onSubmit}
      isSubmitting={saving}
      error={formError ?? undefined}
    >
      <AmountField
        label="Valor esperado"
        name="expectedAmountCents"
        cents={cents}
        onChange={onChange}
        kind={kind}
        error={error}
      />
      <FineNote icon="calendar">
        Muda só este mês. O valor da recorrência continua o mesmo.
      </FineNote>
    </FormModal>
  );
}
