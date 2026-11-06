import { normalizeText } from '../../common/text/normalize-text.util.ts';
import { SUBSCRIPTION_SUGGESTION_EXCLUSIONS } from './subscription-service.constant.ts';

/** True when a card description is on the exclusion list and never becomes a suggestion (BR-REC-017). */
export function isExcludedFromSuggestions(description: string): boolean {
  const normalized = normalizeText(description);

  return SUBSCRIPTION_SUGGESTION_EXCLUSIONS.some((pattern) => pattern.test(normalized));
}
