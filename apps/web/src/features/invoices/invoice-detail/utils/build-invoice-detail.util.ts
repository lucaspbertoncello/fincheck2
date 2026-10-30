import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import type {
  InvoiceDetailData,
  InvoiceDetailItem,
} from '#/features/invoices/invoice-detail/types/invoice-detail.type.ts';
import { buildInvoiceDueLine } from '#/features/invoices/invoice-summary/utils/build-invoice-due-line.util.ts';
import { formatShortDate } from '#/features/invoices/invoice-summary/utils/format-short-date.util.ts';
import { formatMonthParts } from '#/shared/utils/format-month-parts.util.ts';
import { formatMoney } from '#/shared/utils/format-money.util.ts';

const STATUS: Record<Invoice.Status, { label: string; tone: InvoiceDetailData['statusTone'] }> = {
  open: { label: 'Fatura aberta', tone: 'accent' },
  projected: { label: 'Fatura projetada', tone: 'neutral' },
  closed: { label: 'Fatura fechada', tone: 'neutral' },
  partial: { label: 'Paga em parte', tone: 'warn' },
  overdue: { label: 'Vencida', tone: 'warn' },
  paid: { label: 'Fatura paga', tone: 'ok' },
};

function buildItem(item: Invoice.Item): InvoiceDetailItem {
  if (item.type === 'expected_recurrence') {
    return {
      key: item.occurrenceId,
      title: item.recurrenceName,
      meta: item.expectedOn ? `Esperada em ${formatShortDate(item.expectedOn)}` : 'Esperada no mês',
      cents: -item.amountCents,
      expected: true,
    };
  }

  const installment = item.installment
    ? ` · Parcela ${item.installment.number} de ${item.installment.count}`
    : '';
  return {
    key: item.transactionId,
    title: item.description,
    meta: `${formatShortDate(item.occurredOn)}${installment}`,
    cents: item.amountCents,
    expected: false,
  };
}

/** What the invoice modal draws, from the invoice with its items (`Invoice.DetailDto`). */
export function buildInvoiceDetail(
  invoice: Invoice.DetailDto,
  cardName: string,
): InvoiceDetailData {
  const { monthLabel, yearLabel } = formatMonthParts(invoice.month);
  const status = STATUS[invoice.status];
  const suggestion = invoice.paymentSuggestion;

  const breakdown = [
    { key: 'purchases', label: 'Compras', cents: invoice.breakdown.purchasesCents },
    { key: 'installments', label: 'Parcelas', cents: invoice.breakdown.installmentsCents },
    {
      key: 'recurring',
      label: 'Recorrentes esperadas',
      cents: invoice.breakdown.expectedRecurringCents,
    },
  ].filter((line) => line.cents !== 0);

  const references = [
    invoice.bankTotalCents === null
      ? null
      : { key: 'bank', label: 'Total do banco', cents: invoice.bankTotalCents },
    invoice.totalOverrideCents === null
      ? null
      : { key: 'override', label: 'Sua correção', cents: invoice.totalOverrideCents },
  ].filter((line) => line !== null);

  return {
    title: `Fatura de ${monthLabel} ${yearLabel}`,
    cardName,
    statusLabel: status.label,
    statusTone: status.tone,
    totalCents: invoice.totalCents,
    dueLine: buildInvoiceDueLine(invoice),
    breakdown,
    references,
    payments: invoice.payments.map((payment) => ({
      id: payment.id,
      label: `Pago em ${formatShortDate(payment.paidOn)}`,
      cents: payment.amountCents,
    })),
    suggestion: suggestion
      ? {
          transactionId: suggestion.transactionId,
          description: suggestion.description,
          detail: `${formatMoney(Math.abs(suggestion.amountCents))} em ${formatShortDate(suggestion.occurredOn)}`,
          isPresumed: suggestion.isPresumed,
          amountCents: Math.abs(suggestion.amountCents),
          occurredOn: suggestion.occurredOn,
        }
      : null,
    items: invoice.items.map(buildItem),
    remainingCents: invoice.remainingCents,
    canRegisterPayment: invoice.status !== 'projected' && invoice.remainingCents > 0,
  };
}
