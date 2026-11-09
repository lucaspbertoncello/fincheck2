import { normalizeDescription } from '@fincheck/shared/common/text/normalize-description.util.ts';

// The key of a suggestion: the normalized description (no installment "n/N") plus the card it was
// charged on. The dismissal is recorded under the same two parts.
export function buildSubscriptionKey(description: string, accountId: string): string {
  return `${normalizeDescription(description)}|${accountId}`;
}
