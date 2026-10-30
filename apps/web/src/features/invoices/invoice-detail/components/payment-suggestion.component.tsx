import { Button, Icon } from '@fincheck/ui';

import type { InvoiceSuggestionData } from '#/features/invoices/invoice-detail/types/invoice-detail.type.ts';

type PaymentSuggestionProps = {
  suggestion: InvoiceSuggestionData;
  isBusy: boolean;
  onLink: () => void;
  onDismiss: () => void;
};

/** The payment the app found in the account: one tap links it to the invoice, one tap says it is not this. */
export function PaymentSuggestion({
  suggestion,
  isBusy,
  onLink,
  onDismiss,
}: PaymentSuggestionProps) {
  return (
    <section
      aria-label="Pagamento encontrado"
      className="flex flex-col gap-s12 rounded-panel bg-brand-weak p-s16"
    >
      <div className="flex items-start gap-s12">
        <span className="grid size-ctl-sm shrink-0 place-items-center rounded-capsule bg-field text-brand">
          <Icon name="magic" size="md" />
        </span>
        <div className="flex flex-col gap-s4">
          <h3 className="text-body font-emphasis text-fg-primary">Pagamento encontrado</h3>
          <p className="text-label text-fg-secondary">
            {suggestion.description}, {suggestion.detail}.{' '}
            {suggestion.isPresumed
              ? 'A fatura já o conta como pago; falta só vincular.'
              : 'Vincule para abater a fatura.'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-s8">
        <Button size="sm" isDisabled={isBusy} onPress={onLink}>
          Vincular
        </Button>
        <Button size="sm" variant="secondary" isDisabled={isBusy} onPress={onDismiss}>
          Não é este
        </Button>
      </div>
    </section>
  );
}
