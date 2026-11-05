import type { ServiceLogoData } from '@fincheck/ui';

import { SERVICE_PATTERNS } from '#/domain/recurrences/service-logo/constants/service-patterns.constant.ts';
import { normalizeServiceText } from '#/domain/recurrences/service-logo/rules/normalize-service-text.rule.ts';

/**
 * The subscription service a charge description points to ("NETFLIX.COM", "GOOGLE *YOUTUBEPREMIUM",
 * "OPENAI *CHATGPT"), or `null` when it names none of the 26. Give every text that may name it (the
 * name of the recurrence, then the text it matches); the first one that is recognized wins.
 */
export function recognizeService(
  ...texts: readonly (string | null | undefined)[]
): ServiceLogoData | null {
  for (const text of texts) {
    if (!text) continue;
    const normalized = normalizeServiceText(text);
    const found = SERVICE_PATTERNS.find((service) =>
      service.patterns.some((pattern) => pattern.test(normalized)),
    );
    if (found) return { name: found.name, slug: found.slug };
  }

  return null;
}
