import { normalizeText } from './normalize-text.util.ts';
import { stripInstallmentSuffix } from './strip-installment-suffix.util.ts';

// The key to group a description: no "n/N" of the installment, then upper case, no accents and
// single spaces (`normalizeText`, the same function the web uses). One function for the rule
// suggestion, the subscription suggestion, the review queue and the counterparties list.
export function normalizeDescription(description: string): string {
  return normalizeText(stripInstallmentSuffix(description));
}
