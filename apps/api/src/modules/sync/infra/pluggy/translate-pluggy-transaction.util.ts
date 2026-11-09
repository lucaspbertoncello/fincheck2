import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import { convertAmountToCents } from '#/modules/sync/infra/pluggy/convert-amount-to-cents.util.ts';
import { isForeignCurrency } from '#/modules/sync/infra/pluggy/is-foreign-currency.util.ts';
import type { PluggyTransaction } from '#/modules/sync/infra/pluggy/pluggy-transaction.type.ts';
import { requirePluggyDate } from '#/modules/sync/infra/pluggy/require-pluggy-date.util.ts';
import { translatePluggyInstallment } from '#/modules/sync/infra/pluggy/translate-pluggy-installment.util.ts';
import { translatePluggyMethod } from '#/modules/sync/infra/pluggy/translate-pluggy-method.util.ts';

const trimmed = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

// The transaction of the port; null when the amount is zero (nothing moved, the core never gets it)
// and when it is in another currency and the bank did not say it in the currency of the account
// (`amountInAccountCurrency`): it is not reais, and no exchange rate is invented.
// The sign is the one of Lucas: on a checking or savings account `type` decides it (a debit leaves);
// the card is the opposite, the Pluggy sends the purchase positive and the payment negative, so it
// is flipped (purchase negative, payment and refund positive).
export function translatePluggyTransaction(
  response: PluggyTransaction.Response,
  accountType: 'checking' | 'savings' | 'credit_card',
): BankDataProvider.Transaction | null {
  if (typeof response.id !== 'string' || response.id === '') {
    throw new TypeError('The transaction has no id');
  }
  const foreignCurrency = isForeignCurrency(response.currencyCode);
  const inAccountCurrency = response.amountInAccountCurrency;

  if (foreignCurrency && typeof inAccountCurrency !== 'number') return null;
  const raw = typeof inAccountCurrency === 'number' ? inAccountCurrency : response.amount;
  const cents = convertAmountToCents(raw);

  if (cents === 0) return null;
  // On the card the sign the bank sent is flipped; elsewhere only `type` says where the money went.
  const amountCents =
    accountType === 'credit_card'
      ? -cents
      : response.type === 'CREDIT'
        ? Math.abs(cents)
        : -Math.abs(cents);
  const payment = response.paymentData;
  const counterparty = trimmed(amountCents > 0 ? payment?.payer?.name : payment?.receiver?.name);

  return {
    id: response.id,
    providerRef: trimmed(response.providerId) || null,
    description:
      trimmed(response.description) || trimmed(response.descriptionRaw) || 'Sem descrição',
    amountCents,
    occurredOn: requirePluggyDate(response.date),
    counterparty: counterparty || null,
    status: response.status === 'PENDING' ? 'pending' : 'posted',
    method: translatePluggyMethod({
      accountType,
      direction: amountCents < 0 ? 'debit' : 'credit',
      operationType: response.operationType,
      paymentMethod: payment?.paymentMethod,
    }),
    installment: translatePluggyInstallment(response.creditCardMetadata, { foreignCurrency }),
  };
}
