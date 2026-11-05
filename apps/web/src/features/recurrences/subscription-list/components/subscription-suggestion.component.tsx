import { Banner, ServiceLogo } from '@fincheck/ui';

import type { SubscriptionSuggestionData } from '#/features/recurrences/subscription-list/types/subscription-list.type.ts';

type SubscriptionSuggestionProps = {
  suggestion: SubscriptionSuggestionData;
  onAccept: (suggestion: SubscriptionSuggestionData) => void;
  onDismiss: (suggestion: SubscriptionSuggestionData) => void;
};

/** "Parece uma assinatura: Podcast Plus, R$ 19,90" with "Acompanhar" and "Agora não". */
export function SubscriptionSuggestion({
  suggestion,
  onAccept,
  onDismiss,
}: SubscriptionSuggestionProps) {
  return (
    <Banner
      variant="suggestion"
      mark={
        suggestion.service ? (
          <ServiceLogo slug={suggestion.service.slug} name={suggestion.service.name} />
        ) : undefined
      }
      title={suggestion.title}
      description={suggestion.description}
      actionsPlacement="below"
      actionLabel="Acompanhar"
      onAction={() => onAccept(suggestion)}
      secondaryActionLabel="Agora não"
      onSecondaryAction={() => onDismiss(suggestion)}
    />
  );
}
