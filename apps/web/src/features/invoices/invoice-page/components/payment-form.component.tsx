import { AmountField, DateQuickField, FormModalSplit } from '@fincheck/ui';
import { useRef } from 'react';

import { INVALID_FIELD_SELECTOR } from '#/shared/constants/form/invalid-field-selector.constant.ts';
import { useFocusFirstInvalid } from '#/shared/hooks/form/use-focus-first-invalid.hook.ts';

type PaymentFormProps = {
  formId: string;
  cents: number;
  onCentsChange: (cents: number) => void;
  paidOn: string;
  onPaidOnChange: (value: string) => void;
  /** Today as `YYYY-MM-DD`, so "Hoje" and "Ontem" follow the business day. */
  today: string;
  error?: string;
  failedAttempts: number;
  onSubmit: () => void;
};

/**
 * "Registrar pagamento": the amount (already the rest of the invoice) and when it was paid. The
 * footer of the modal holds the buttons; Enter in the amount submits too.
 */
export function PaymentForm({
  formId,
  cents,
  onCentsChange,
  paidOn,
  onPaidOnChange,
  today,
  error,
  failedAttempts,
  onSubmit,
}: PaymentFormProps) {
  const form = useRef<HTMLFormElement>(null);
  useFocusFirstInvalid({
    attempt: failedAttempts,
    selector: INVALID_FIELD_SELECTOR,
    scope: form,
  });

  return (
    <form
      id={formId}
      ref={form}
      noValidate
      aria-label="Registrar pagamento"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="@container rounded-panel border border-line bg-subtle p-s16"
    >
      <FormModalSplit
        aside={
          <AmountField
            kind="expense"
            label="Valor pago"
            cents={cents}
            onChange={onCentsChange}
            error={error}
            description="Já vem o que falta; mude se pagou outro valor."
            autoFocus
          />
        }
      >
        <DateQuickField
          label="Data do pagamento"
          value={paidOn}
          onChange={onPaidOnChange}
          today={today}
        />
      </FormModalSplit>
    </form>
  );
}
