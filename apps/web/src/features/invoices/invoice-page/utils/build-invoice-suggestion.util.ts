import type { Invoice } from '@fincheck/shared/invoices/invoice/invoice.type.ts';

import type { InvoiceSuggestionData } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';
import { formatShortDate } from '#/features/invoices/invoice-summary/utils/format-short-date.util.ts';
import { formatMoney } from '#/shared/utils/format-money.util.ts';

/** "Pagamento encontrado": the debit the app found, as the card draws it; null when there is none. */
export function buildInvoiceSuggestion(
  suggestion: Invoice.PaymentSuggestion | null,
): InvoiceSuggestionData | null {
  if (!suggestion) return null;

  return {
    transactionId: suggestion.transactionId,
    description: suggestion.description,
    detail: `${formatMoney(Math.abs(suggestion.amountCents))} em ${formatShortDate(suggestion.occurredOn)}`,
    isPresumed: suggestion.isPresumed,
    amountCents: Math.abs(suggestion.amountCents),
    occurredOn: suggestion.occurredOn,
  };
}
