import { useAccounts } from '#/domain/accounts/account/hooks/use-accounts.hook.ts';
import { useLinkOccurrencePayment } from '#/domain/recurrences/occurrence/hooks/use-link-occurrence-payment.hook.ts';
import { useOccurrenceCandidates } from '#/domain/recurrences/occurrence/hooks/use-occurrence-candidates.hook.ts';
import { useOccurrences } from '#/domain/recurrences/occurrence/hooks/use-occurrences.hook.ts';
import { useUnlinkOccurrencePayment } from '#/domain/recurrences/occurrence/hooks/use-unlink-occurrence-payment.hook.ts';

/** The occurrence being linked, its candidate transactions and the link / unlink changes. */
export function useLinkOccurrenceModel(month: string, occurrenceId: string | undefined) {
  return {
    occurrences: useOccurrences(month),
    candidates: useOccurrenceCandidates(occurrenceId ?? '', {
      enabled: occurrenceId !== undefined,
    }),
    accounts: useAccounts(),
    link: useLinkOccurrencePayment(),
    unlink: useUnlinkOccurrencePayment(),
  };
}
