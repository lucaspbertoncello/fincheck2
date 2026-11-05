import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';
import { Button, Chip, Money } from '@fincheck/ui';

import { describeDateRule } from '#/features/recurrences/recurrence-list/utils/describe-date-rule.util.ts';
import { EMPLOYMENT_REGIME_LABEL } from '#/features/profile/profile/constants/employment-regime-label.constant.ts';
import { formatShortDay } from '#/features/profile/profile/utils/format-short-day.util.ts';

type IncomeSourceRowProps = {
  source: Profile.IncomeSource;
  onEdit: () => void;
};

/** One source of income: who pays, how, the amount and when it lands. Editing opens the recurrence. */
export function IncomeSourceRow({ source, onEdit }: IncomeSourceRowProps) {
  const details = [
    source.counterparty && source.counterparty !== source.name ? source.counterparty : null,
    describeDateRule(source.dateRule),
    source.nextExpectedOn ? `próximo: ${formatShortDay(source.nextExpectedOn)}` : null,
  ].filter((part): part is string => part !== null);

  return (
    <li className="flex items-center justify-between gap-s16 border-t border-line py-s16 first:border-t-0 first:pt-0 max-lg:flex-wrap">
      <div className="flex min-w-0 flex-col gap-s4">
        <div className="flex items-center gap-s8">
          <p className="truncate text-body font-emphasis text-fg-primary">{source.name}</p>
          {source.employmentRegime ? (
            <Chip tone="accent">{EMPLOYMENT_REGIME_LABEL[source.employmentRegime]}</Chip>
          ) : null}
        </div>
        <p className="text-meta text-fg-secondary">{details.join(' · ')}</p>
      </div>
      <div className="flex items-center gap-s12">
        <div className="flex flex-col items-end gap-s4">
          <Money
            cents={source.expectedAmountCents}
            sign="none"
            weight="plain"
            tone="income"
            className="text-money-row"
          />
          {source.amountMode === 'last_received' ? (
            <span className="text-meta text-fg-secondary">igual ao último recebido</span>
          ) : null}
        </div>
        <Button variant="tertiary" size="sm" icon="edit" onPress={onEdit}>
          Editar
        </Button>
      </div>
    </li>
  );
}
