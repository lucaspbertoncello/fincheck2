import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';

import type { PaymentCandidateOption } from '#/features/bills/types/payment-candidate-option.type.ts';
import { formatDayMonth } from '#/features/bills/utils/format-day-month.util.ts';

/** The payment candidates of the API as options of a picker (amounts without the sign). */
export function buildCandidateOptions(
  candidates: readonly Bill.PaymentCandidateDto[],
): PaymentCandidateOption[] {
  return candidates.map((candidate) => ({
    transactionId: candidate.transactionId,
    description: candidate.description,
    dateText: formatDayMonth(candidate.occurredOn),
    amountCents: Math.abs(candidate.amountCents),
    counterparty: candidate.counterparty,
  }));
}
