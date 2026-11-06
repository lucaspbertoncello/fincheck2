import { Banner, Icon, ServiceLogo } from '@fincheck/ui';

import type { SubscriptionSuggestionData } from '#/features/recurrences/subscription-list/types/subscription-list.type.ts';

type SubscriptionSuggestionProps = {
  suggestion: SubscriptionSuggestionData;
  onAccept: (suggestion: SubscriptionSuggestionData) => void;
  onDismiss: (suggestion: SubscriptionSuggestionData) => void;
};

/**
 * "Parece uma assinatura: Podcast Plus, R$ 19,90" with "Acompanhar" and "Agora não". The mark is
 * always the logo circle (the service logo, or the suggestion icon in the same circle), so the text
 * of every card starts at the same column.
 */
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
          <ServiceLogo slug={suggestion.service.slug} />
        ) : (
          <span
            aria-hidden="true"
            className="inline-grid size-9 shrink-0 place-items-center rounded-capsule bg-subtle text-brand lg:size-10"
          >
            <Icon name="magic" size="md" />
          </span>
        )
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
