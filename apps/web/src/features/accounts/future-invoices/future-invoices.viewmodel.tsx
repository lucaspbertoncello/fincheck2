import { useFutureInvoicesModel } from '#/features/accounts/future-invoices/future-invoices.model.ts';
import { FutureInvoicesView } from '#/features/accounts/future-invoices/future-invoices.view.tsx';
import { buildInvoiceDueLine } from '#/domain/invoices/invoice/rules/build-invoice-due-line.rule.ts';
import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';

type FutureInvoicesViewModelProps = {
  cardId: string;
  onBack: () => void;
  onViewInvoice: (month: string) => void;
};

function withShares<T extends { cents: number }>(parts: T[]): (T & { share: number })[] {
  const sum = parts.reduce((total, part) => total + Math.abs(part.cents), 0);
  return parts.map((part) => ({ ...part, share: sum === 0 ? 0 : Math.abs(part.cents) / sum }));
}

/** "Faturas futuras" of a card: 3 projected months in place of the cards (RF-INV-003). */
export function FutureInvoicesViewModel({
  cardId,
  onBack,
  onViewInvoice,
}: FutureInvoicesViewModelProps) {
  const model = useFutureInvoicesModel(cardId);

  const items = model.invoices.map((invoice) => {
    const { monthLabel, yearLabel } = formatMonthParts(invoice.month);
    return {
      month: invoice.month,
      title: `${monthLabel} ${yearLabel}`,
      totalCents: invoice.totalCents,
      dueLine: buildInvoiceDueLine(invoice),
      parts: withShares(
        [
          { key: 'installments', label: 'Parcelas', cents: invoice.breakdown.installmentsCents },
          {
            key: 'recurring',
            label: 'Recorrentes esperadas',
            cents: invoice.breakdown.expectedRecurringCents,
          },
          { key: 'purchases', label: 'Compras', cents: invoice.breakdown.purchasesCents },
        ].filter((part) => part.cents !== 0),
      ),
    };
  });

  return (
    <FutureInvoicesView
      state={model.isLoading ? 'loading' : model.isError ? 'error' : 'ready'}
      cardName={model.cardName}
      items={items}
      onBack={onBack}
      onRetry={model.retry}
      onViewInvoice={onViewInvoice}
    />
  );
}
