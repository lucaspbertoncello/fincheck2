import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';

import { recognizeService } from '#/domain/recurrences/service-logo/rules/recognize-service.rule.ts';
import type { SubscriptionSuggestionData } from '#/features/recurrences/subscription-list/types/subscription-list.type.ts';
import { formatMoneyText } from '#/features/recurrences/subscription-list/utils/format-money-text.util.ts';
import { formatShortDate } from '#/features/recurrences/subscription-list/utils/format-short-date.util.ts';
import { formatSuggestionName } from '#/features/recurrences/subscription-list/utils/format-suggestion-name.util.ts';

/** A suggestion as the banner says it: "Parece uma assinatura: Podcast Plus, R$ 19,90". */
export function presentSubscriptionSuggestion(
  suggestion: Subscription.Suggestion,
  accountNames: ReadonlyMap<string, string>,
  hidden: boolean,
): SubscriptionSuggestionData {
  const name = formatSuggestionName(suggestion.description);
  const card = accountNames.get(suggestion.accountId);

  return {
    key: suggestion.key,
    name,
    service: recognizeService(suggestion.description),
    title: `Parece uma assinatura: ${name}, ${formatMoneyText(suggestion.lastAmountCents, hidden)}`,
    description: `Cobrada em ${suggestion.monthsSeen} meses seguidos${card ? ` no ${card}` : ''}, a última em ${formatShortDate(suggestion.lastChargedOn)}.`,
  };
}
