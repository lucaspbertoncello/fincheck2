import { Button, EditDateField, FineNote, Modal, Money, MoneyField } from '@fincheck/ui';

import { PaymentCandidatePicker } from '#/features/bills/components/payment-candidate-picker.component.tsx';
import type { PaymentRegisterViewProps } from '#/features/bills/payment-register/payment-register.model.ts';

export function PaymentRegisterView({
  formRef,
  isOpen,
  onClose,
  title,
  subtitle,
  flow,
  amountCents,
  onAmountChange,
  paidOn,
  onPaidOnChange,
  errors,
  remainingCents,
  candidates,
  submitError,
  isSaving,
  onSubmit,
}: PaymentRegisterViewProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      isDismissable={!isSaving}
      title={title}
      subtitle={subtitle}
      actions={
        <>
          <Button variant="secondary" isDisabled={isSaving} onPress={onClose}>
            Cancelar
          </Button>
          <Button form="payment-register-form" type="submit" loading={isSaving}>
            {flow === 'income' ? 'Registrar recebimento' : 'Registrar pagamento'}
          </Button>
        </>
      }
    >
      <form
        id="payment-register-form"
        ref={formRef}
        noValidate
        className="flex flex-col gap-s16"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {candidates ? (
          <PaymentCandidatePicker
            label={flow === 'income' ? 'Pix recebido' : 'Pix já feito'}
            optional
            options={candidates.options}
            value={candidates.selected}
            onChange={candidates.onSelect}
            isLoading={candidates.isLoading}
            noneLabel="Registrar à mão"
            emptyText="Nenhuma transação recente serve. Registre à mão."
          />
        ) : null}
        <MoneyField
          label={flow === 'income' ? 'Quanto você recebeu' : 'Quanto você pagou'}
          cents={amountCents}
          onChange={onAmountChange}
          error={errors.amountCents}
          autoFocus
        />
        <EditDateField
          label={flow === 'income' ? 'Recebido em' : 'Pago em'}
          value={paidOn}
          onChange={onPaidOnChange}
          error={errors.paidOn}
        />
        <FineNote icon="calendar">
          Falta <Money cents={remainingCents} sign="none" weight="plain" />. Pode registrar só uma
          parte: o restante continua {flow === 'income' ? 'a receber' : 'a pagar'}.
        </FineNote>
        {submitError ? (
          <p role="alert" className="text-label text-loss">
            {submitError}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
