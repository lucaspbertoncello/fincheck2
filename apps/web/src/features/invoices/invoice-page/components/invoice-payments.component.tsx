import { Button, CategoryIcon, Collapse, ListRow, Money, Section } from '@fincheck/ui';

import { PaymentForm } from '#/features/invoices/invoice-page/components/payment-form.component.tsx';

const PAYMENT_FORM_ID = 'invoice-payment-form';

type InvoicePaymentsProps = {
  payments: readonly { id: string; label: string; cents: number }[];
  registering: boolean;
  isBusy: boolean;
  cents: number;
  onCentsChange: (cents: number) => void;
  paidOn: string;
  onPaidOnChange: (value: string) => void;
  today: string;
  error?: string;
  failedAttempts: number;
  onSave: () => void;
  onCancel: () => void;
};

/**
 * "Pagamentos": what was paid so far and, once "Registrar pagamento" is pressed, the form (the
 * amount is already what is left) with its own Cancelar and Salvar. The form opens with the
 * Collapse, so nothing jumps.
 */
export function InvoicePayments({
  payments,
  registering,
  isBusy,
  cents,
  onCentsChange,
  paidOn,
  onPaidOnChange,
  today,
  error,
  failedAttempts,
  onSave,
  onCancel,
}: InvoicePaymentsProps) {
  return (
    <Section title="Pagamentos">
      {payments.length === 0 ? (
        <p className="text-label text-fg-secondary">Nenhum pagamento ainda.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col divide-y divide-line p-0">
          {payments.map((payment) => (
            <ListRow
              key={payment.id}
              mark={<CategoryIcon icon="check" />}
              name={payment.label}
              value={
                <Money
                  cents={payment.cents}
                  sign="none"
                  weight="plain"
                  className="text-money-row"
                />
              }
            />
          ))}
        </ul>
      )}
      <Collapse isOpen={registering} trackClassName="-mt-s16" contentClassName="pt-s16">
        <div className="flex flex-col gap-s16">
          <PaymentForm
            formId={PAYMENT_FORM_ID}
            cents={cents}
            onCentsChange={onCentsChange}
            paidOn={paidOn}
            onPaidOnChange={onPaidOnChange}
            today={today}
            error={error}
            failedAttempts={failedAttempts}
            onSubmit={onSave}
          />
          <div className="flex flex-wrap items-center gap-s8">
            <Button
              type="submit"
              form={PAYMENT_FORM_ID}
              size="sm"
              loading={isBusy}
              loadingLabel="Salvando..."
            >
              Salvar pagamento
            </Button>
            <Button variant="secondary" size="sm" isDisabled={isBusy} onPress={onCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      </Collapse>
    </Section>
  );
}
