import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import { convertAmountToCents } from '#/modules/sync/infra/pluggy/convert-amount-to-cents.util.ts';
import { isForeignCurrency } from '#/modules/sync/infra/pluggy/is-foreign-currency.util.ts';
import type { PluggyBill } from '#/modules/sync/infra/pluggy/pluggy-bill.type.ts';
import { requirePluggyDate } from '#/modules/sync/infra/pluggy/require-pluggy-date.util.ts';

// The invoice of the port; null when the total is in another currency (it is not reais).
export function translatePluggyBill(
  response: PluggyBill.Response,
): BankDataProvider.Invoice | null {
  if (typeof response.id !== 'string' || response.id === '') {
    throw new TypeError('The bill has no id');
  }

  if (isForeignCurrency(response.totalAmountCurrencyCode)) return null;

  return {
    id: response.id,
    dueOn: requirePluggyDate(response.dueDate),
    totalCents: Math.abs(convertAmountToCents(response.totalAmount)),
  };
}
