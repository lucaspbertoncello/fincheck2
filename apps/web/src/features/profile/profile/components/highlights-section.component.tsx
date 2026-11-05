import { Section } from '@fincheck/ui';

import { SectionError } from '#/features/settings/settings/components/section-error.component.tsx';
import { HighlightCard } from '#/features/profile/profile/components/highlight-card.component.tsx';
import type { HighlightItem } from '#/features/profile/profile/types/highlight-item.type.ts';

type HighlightsSectionProps = {
  state: 'loading' | 'error' | 'ready';
  /** The six cards, always in the same order. */
  items: HighlightItem[];
  onRetry: () => void;
};

/**
 * "Curiosidades" (BR-PRF-005): six cards for fun, no action on any of them. Three per row where the
 * section is wide enough for them (a container query: 1280 px of window gives three, the narrower
 * 1024 px gives two) and two on the phone. A line with the sentence when the read fails.
 */
export function HighlightsSection({ state, items, onRetry }: HighlightsSectionProps) {
  return (
    <Section title="Curiosidades">
      {state === 'error' ? (
        <SectionError message="Não deu para carregar as curiosidades." onRetry={onRetry} />
      ) : (
        <div
          role={state === 'loading' ? 'status' : undefined}
          aria-label={state === 'loading' ? 'Carregando as curiosidades' : undefined}
          className="@container/highlights"
        >
          <ul
            aria-label="Curiosidades"
            className="grid grid-cols-2 gap-s12 @min-[40rem]/highlights:grid-cols-3"
          >
            {items.map((item) => (
              <li key={item.key} className="flex min-w-0">
                <HighlightCard item={item} isLoading={state === 'loading'} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}
