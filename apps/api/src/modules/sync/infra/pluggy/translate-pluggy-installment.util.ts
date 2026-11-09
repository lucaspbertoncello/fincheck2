import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import { convertAmountToCents } from '#/modules/sync/infra/pluggy/convert-amount-to-cents.util.ts';
import type { PluggyTransaction } from '#/modules/sync/infra/pluggy/pluggy-transaction.type.ts';
import { translatePluggyDate } from '#/modules/sync/infra/pluggy/translate-pluggy-date.util.ts';

// The installment of a card purchase; null when the bank does not say it or it is not an installment
// (a single payment comes as "1 of 1").
export function translatePluggyInstallment(
  metadata: PluggyTransaction.Response['creditCardMetadata'],
  options: { foreignCurrency?: boolean } = {},
): BankDataProvider.Transaction['installment'] {
  const number = metadata?.installmentNumber;
  const total = metadata?.totalInstallments;

  if (typeof number !== 'number' || typeof total !== 'number') return null;
  if (!Number.isInteger(number) || !Number.isInteger(total)) return null;
  if (total < 2 || number < 1 || number > total) return null;

  return {
    number,
    total,
    // The total is in the currency of the purchase: abroad it is not in reais, so there is none.
    totalCents:
      typeof metadata?.totalAmount === 'number' && !options.foreignCurrency
        ? Math.abs(convertAmountToCents(metadata.totalAmount))
        : null,
    purchaseOn: translatePluggyDate(metadata?.purchaseDate),
  };
}
