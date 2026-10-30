import { Banner, Button, FineNote, Modal, MoneyField } from '@fincheck/ui';

type ExpectedAmountViewProps = {
  name: string;
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

const FORM_ID = 'expected-amount-form';

/** "Editar valor esperado": the new amount of this month only; the recurrence does not change. */
export function ExpectedAmountView({
  name,
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
    <Modal
      isOpen
      onOpenChange={(open) => !open && onClose()}
      isDismissable={!saving}
      title="Editar valor esperado"
      subtitle={`${name}, ${scopeLabel}`}
      actions={
        <>
          <Button variant="tertiary" onPress={onClose} isDisabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} loading={saving}>
            Salvar valor
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="flex flex-col gap-s16"
      >
        <MoneyField
          label="Valor esperado"
          name="expectedAmountCents"
          cents={cents}
          onChange={onChange}
          error={error}
        />
        <FineNote icon="calendar">
          Muda só este mês. O valor da recorrência continua o mesmo.
        </FineNote>
        {formError ? (
          <Banner variant="error" title="Não foi possível salvar" description={formError} />
        ) : null}
      </form>
    </Modal>
  );
}
