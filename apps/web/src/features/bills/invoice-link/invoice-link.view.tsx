import { FormModal, FormModalGroup, Icon, Money } from '@fincheck/ui';

import type { InvoiceLinkViewProps } from '#/features/bills/invoice-link/invoice-link.model.ts';

const EFFECTS = [
  'A fatura passa a paga e nenhuma transação nova é criada.',
  'O pagamento não conta como gasto de novo: só as compras da fatura contam.',
  'Se não for este, você escolhe outro lançamento ou registra à mão.',
] as const;

export function InvoiceLinkView({
  isOpen,
  onClose,
  invoiceName,
  description,
  accountName,
  amountCents,
  dateText,
  submitError,
  isSaving,
  onLink,
  onDismiss,
}: InvoiceLinkViewProps) {
  return (
    <FormModal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      size="wide"
      title="Vincular o pagamento?"
      description={invoiceName}
      submitLabel="Vincular"
      submittingLabel="Vinculando..."
      cancelLabel="Agora não"
      onSubmit={onLink}
      isSubmitting={isSaving}
      error={submitError ?? undefined}
      destructive={{ label: 'Não é este', icon: 'close', onPress: onDismiss }}
    >
      <FormModalGroup label="Pagamento encontrado">
        <div className="flex items-center gap-s16 rounded-panel border border-line bg-subtle p-s16">
          <div className="flex min-w-0 flex-1 flex-col gap-s4">
            <span className="truncate text-body font-emphasis text-fg-primary">
              {description ?? `Pagamento${accountName ? ` no ${accountName}` : ''}`}
            </span>
            <span className="truncate text-label text-fg-secondary">
              {accountName ? `${accountName} · ` : ''}
              {dateText}
            </span>
          </div>
          <Money cents={amountCents} sign="none" weight="emphasis" className="text-money-md" />
        </div>
      </FormModalGroup>
      <FormModalGroup label="Ao vincular">
        <ul className="m-0 flex list-none flex-col gap-s12 p-0">
          {EFFECTS.map((effect) => (
            <li key={effect} className="flex items-start gap-s8 text-label text-fg-secondary">
              <Icon name="check" size="sm" className="mt-px shrink-0 text-brand" />
              <span>{effect}</span>
            </li>
          ))}
        </ul>
      </FormModalGroup>
    </FormModal>
  );
}
