import { Button, Icon, Modal, Money } from '@fincheck/ui';

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
  accountName,
  amountCents,
  dateText,
  submitError,
  isSaving,
  onLink,
  onDismiss,
}: InvoiceLinkViewProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      isDismissable={!isSaving}
      size="dialog"
      title="Vincular o pagamento?"
      subtitle={invoiceName}
      actions={
        <>
          <Button variant="secondary" isDisabled={isSaving} onPress={onDismiss}>
            Não é este
          </Button>
          <Button icon="link" loading={isSaving} onPress={onLink}>
            Vincular
          </Button>
        </>
      }
    >
      <p className="text-body text-fg-primary">
        Encontramos o pagamento de <Money cents={amountCents} sign="none" weight="plain" />
        {accountName ? ` no ${accountName}` : ''} em {dateText}. Vincular a esta fatura?
      </p>
      <ul className="m-0 flex list-none flex-col gap-s12 rounded-panel bg-subtle p-s16">
        {EFFECTS.map((effect) => (
          <li key={effect} className="flex items-start gap-s8 text-label text-fg-secondary">
            <Icon name="chevron-right" size="sm" className="mt-px shrink-0" />
            <span>{effect}</span>
          </li>
        ))}
      </ul>
      {submitError ? (
        <p role="alert" className="text-label text-loss">
          {submitError}
        </p>
      ) : null}
    </Modal>
  );
}
