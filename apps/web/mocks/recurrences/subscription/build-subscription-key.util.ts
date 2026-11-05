import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';

// The key of a suggestion: the normalized description plus the card it was charged on.
export function buildSubscriptionKey(description: string, accountId: string): string {
  return `${normalizeText(description)}|${accountId}`;
}
