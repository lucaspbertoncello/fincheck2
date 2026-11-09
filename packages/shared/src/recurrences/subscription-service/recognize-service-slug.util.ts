import { normalizeServiceText } from './normalize-service-text.util.ts';
import { SUBSCRIPTION_SERVICE_PATTERNS } from './subscription-service.constant.ts';
import type { SubscriptionService } from './subscription-service.type.ts';

// The subscription service a charge description points to ("NETFLIX.COM", "GOOGLE *YOUTUBEPREMIUM",
// "OPENAI *CHATGPT"), or `null` when it names none of the 25. Give every text that may name it (the
// name of the recurrence, then the text it matches); the first one that is recognized wins. The API
// and the front use this one list, so a charge is the same service on both sides.
export function recognizeServiceSlug(
  ...texts: readonly (string | null | undefined)[]
): SubscriptionService.Slug | null {
  for (const text of texts) {
    if (!text) continue;
    const normalized = normalizeServiceText(text);
    const found = SUBSCRIPTION_SERVICE_PATTERNS.find((service) =>
      service.patterns.some((pattern) => pattern.test(normalized)),
    );
    if (found) return found.slug;
  }

  return null;
}
