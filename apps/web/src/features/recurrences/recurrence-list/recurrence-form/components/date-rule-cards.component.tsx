import { Icon } from '@fincheck/ui';
import { Radio, RadioGroup } from 'react-aria-components';

import { DATE_RULE_CARDS } from '#/features/recurrences/recurrence-list/recurrence-form/constants/date-rule-cards.constant.ts';
import type { RecurrenceFormValues } from '#/features/recurrences/recurrence-list/recurrence-form/types/recurrence-form.type.ts';

type DateRuleCardsProps = {
  value: RecurrenceFormValues['ruleType'];
  onChange: (ruleType: RecurrenceFormValues['ruleType']) => void;
};

/**
 * "Como cai no mês": 4 cards in 2 columns, an icon in a round well and the rule in words. The
 * chosen one gets the weak accent fill and the accent border; the border width never changes, so
 * nothing moves. Radio group: the arrows move the choice.
 */
export function DateRuleCards({ value, onChange }: DateRuleCardsProps) {
  return (
    <RadioGroup
      aria-label="Regra de data"
      value={value}
      onChange={(key) => onChange(key as RecurrenceFormValues['ruleType'])}
    >
      <div className="grid grid-cols-2 gap-s8">
        {DATE_RULE_CARDS.map((card) => (
          <Radio
            key={card.key}
            value={card.key}
            className="group focus-ring flex min-h-14 cursor-pointer items-center gap-s8 rounded-input border border-line px-s12 py-s8 text-fg-primary transition-[transform,background-color,border-color] duration-(--duration-fast) ease-(--ease-standard) data-[hovered]:bg-subtle data-[pressed]:scale-96 data-[selected]:border-brand data-[selected]:bg-brand-weak"
          >
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-capsule bg-subtle text-fg-secondary transition-colors duration-(--duration-fast) group-data-[selected]:bg-brand group-data-[selected]:text-fg-on-accent"
            >
              <Icon name={card.icon} size="sm" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-label font-emphasis group-data-[selected]:text-brand">
                {card.label}
              </span>
              <span className="block truncate text-meta text-fg-secondary">{card.example}</span>
            </span>
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}
