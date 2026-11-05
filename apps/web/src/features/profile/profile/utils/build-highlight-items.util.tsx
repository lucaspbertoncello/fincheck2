import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';
import { Money } from '@fincheck/ui';

import { HIGHLIGHT_DEFINITIONS } from '#/features/profile/profile/constants/highlight-definition.constant.ts';
import { WEEKDAY_NAME } from '#/features/profile/profile/constants/weekday-name.constant.ts';
import type {
  HighlightContext,
  HighlightItem,
  HighlightKey,
} from '#/features/profile/profile/types/highlight-item.type.ts';
import { formatCounterpartyName } from '#/features/profile/profile/utils/format-counterparty-name.util.ts';
import { formatHighlightDay } from '#/features/profile/profile/utils/format-highlight-day.util.ts';
import { formatHighlightMonth } from '#/features/profile/profile/utils/format-highlight-month.util.ts';
import { formatStreakRange } from '#/features/profile/profile/utils/format-streak-range.util.ts';

type BuildHighlightItemsInput = {
  /** Null while there is nothing to show (loading, error): every card is then empty. */
  highlights: Profile.Highlights | null;
  /** Name of a category by id; the card falls back to "Sem categoria" for an id it does not know. */
  categoryName: (categoryId: string) => string | undefined;
  /** Today as a business date, to leave the year out of the dates of this year. */
  today: string;
};

type Parts = { value: HighlightItem['value']; context: HighlightContext };

function describePix(pix: Profile.PixHighlight, preposition: 'para' | 'de', today: string): Parts {
  return {
    value: <Money cents={pix.amountCents} sign="none" />,
    context: {
      lead: pix.counterparty
        ? `${preposition} ${formatCounterpartyName(pix.counterparty)}`
        : undefined,
      tail: formatHighlightDay(pix.occurredOn, today),
    },
  };
}

function describe(
  key: HighlightKey,
  highlights: Profile.Highlights,
  input: BuildHighlightItemsInput,
): Parts | null {
  switch (key) {
    case 'largestPixSent':
      return highlights.largestPixSent
        ? describePix(highlights.largestPixSent, 'para', input.today)
        : null;
    case 'largestPixReceived':
      return highlights.largestPixReceived
        ? describePix(highlights.largestPixReceived, 'de', input.today)
        : null;
    case 'topCategory': {
      const top = highlights.topCategory;
      if (!top) return null;

      return {
        value: <Money cents={top.totalCents} sign="none" />,
        context: {
          lead: input.categoryName(top.categoryId) ?? 'Sem categoria',
          tail: `${top.sharePercent.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do gasto`,
        },
      };
    }
    case 'costliestMonth': {
      const month = highlights.costliestMonth;

      return month
        ? {
            value: <Money cents={month.totalCents} sign="none" />,
            context: { tail: formatHighlightMonth(month.month) },
          }
        : null;
    }
    case 'costliestWeekday': {
      const weekday = highlights.costliestWeekday;

      return weekday
        ? {
            value: <Money cents={weekday.averageCents} sign="none" />,
            context: { lead: WEEKDAY_NAME[weekday.weekday], tail: 'média por dia' },
          }
        : null;
    }
    case 'longestNoSpendStreak': {
      const streak = highlights.longestNoSpendStreak;

      return streak
        ? {
            value: (
              <span className="money-numeric inline-flex items-baseline gap-s4 font-numeric whitespace-nowrap">
                <span>{streak.days}</span>
                <span className="money-currency-proportional text-fg-secondary">
                  {streak.days === 1 ? 'dia' : 'dias'}
                </span>
              </span>
            ),
            context: { tail: formatStreakRange(streak.from, streak.to, input.today) },
          }
        : null;
    }
  }
}

/** The six cards of "Curiosidades" in the fixed order of the grid (BR-PRF-005); the order never depends on the data. */
export function buildHighlightItems(input: BuildHighlightItemsInput): HighlightItem[] {
  return HIGHLIGHT_DEFINITIONS.map((definition) => {
    const parts = input.highlights ? describe(definition.key, input.highlights, input) : null;

    return {
      key: definition.key,
      icon: definition.icon,
      label: definition.label,
      value: parts?.value ?? null,
      context: parts?.context ?? null,
    };
  });
}
