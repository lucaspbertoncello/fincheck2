import type { ManualAccountForm } from '#/features/accounts/connect-account/types/connect-account.type.ts';

function toDay(text: string): number | undefined {
  return text.trim() === '' ? undefined : Number(text);
}

/** The body of `POST /accounts` for the form; fields that do not apply to the type are left out. */
export function buildCreateAccountRequest(form: ManualAccountForm): Record<string, unknown> {
  const isCard = form.type === 'credit_card';
  const isWallet = form.type === 'wallet';

  return {
    type: form.type,
    name: form.name,
    ...(isWallet ? {} : { institutionCode: form.institutionCode || undefined }),
    ...(form.institutionCode === 'other' && !isWallet
      ? { institutionName: form.institutionName }
      : {}),
    ...(isCard ? {} : { initialBalanceCents: form.initialBalanceCents }),
    ...(isCard
      ? {
          creditCard: {
            brand: form.brand,
            last4: form.last4.trim() === '' ? undefined : form.last4.trim(),
            closingDay: toDay(form.closingDay),
            dueDay: toDay(form.dueDay),
            limitCents: form.limitCents > 0 ? form.limitCents : undefined,
          },
        }
      : {}),
  };
}
