import {
  AmountField,
  ChoiceChip,
  DateQuickField,
  FineNote,
  FormModal,
  FormModalSplit,
  Money,
} from '@fincheck/ui';

import { CandidateRowsField } from '#/features/bills/components/candidate-rows-field.component.tsx';
import type { PaymentRegisterViewProps } from '#/features/bills/payment-register/payment-register.model.ts';

export function PaymentRegisterView({
  isOpen,
  onClose,
  title,
  subtitle,
  flow,
  amountCents,
  onAmountChange,
  paidOn,
  onPaidOnChange,
  today,
  errors,
  remainingCents,
  candidates,
  submitError,
  isSaving,
  onSubmit,
}: PaymentRegisterViewProps) {
  const isIncome = flow === 'income';
  const half = Math.round(remainingCents / 2);
  const showsHalf = half > 0 && half !== remainingCents;

  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      description={subtitle}
      submitLabel={isIncome ? 'Registrar recebimento' : 'Registrar pagamento'}
      onSubmit={onSubmit}
      isSubmitting={isSaving}
      error={submitError ?? undefined}
    >
      <FormModalSplit
        aside={
          <>
            <AmountField
              label={isIncome ? 'Quanto você recebeu' : 'Quanto você pagou'}
              cents={amountCents}
              onChange={onAmountChange}
              kind={flow}
              error={errors.amountCents}
            />
            <div role="group" aria-label="Valores rápidos" className="flex flex-wrap gap-s8">
              <ChoiceChip
                selected={amountCents === remainingCents}
                onChange={() => onAmountChange(remainingCents)}
              >
                Tudo que falta
              </ChoiceChip>
              {showsHalf ? (
                <ChoiceChip selected={amountCents === half} onChange={() => onAmountChange(half)}>
                  Metade
                </ChoiceChip>
              ) : null}
            </div>
            <FineNote icon="calendar">
              Falta <Money cents={remainingCents} sign="none" weight="plain" />. Pode registrar só
              uma parte: o restante continua {isIncome ? 'a receber' : 'a pagar'}.
            </FineNote>
          </>
        }
      >
        <DateQuickField
          label={isIncome ? 'Recebido em' : 'Pago em'}
          value={paidOn}
          onChange={onPaidOnChange}
          today={today}
          error={errors.paidOn}
        />
        {candidates ? (
          <CandidateRowsField
            label={isIncome ? 'Pix recebido' : 'Pix já feito'}
            optional
            options={candidates.options}
            value={candidates.selected}
            onChange={candidates.onSelect}
            isLoading={candidates.isLoading}
            emptyText="Nenhuma transação recente serve. Registre à mão."
          />
        ) : null}
      </FormModalSplit>
    </FormModal>
  );
}
