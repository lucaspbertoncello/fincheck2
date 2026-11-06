import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';
import { CategoryIcon, Chip, ListRow, Money, OverflowMenu } from '@fincheck/ui';

import { describeDateRule } from '#/shared/utils/recurrences/describe-date-rule.util.ts';
import { EMPLOYMENT_REGIME_LABEL } from '#/features/profile/profile/constants/employment-regime-label.constant.ts';
import { formatShortDay } from '#/features/profile/profile/utils/format-short-day.util.ts';

type IncomeSourceRowProps = {
  source: Profile.IncomeSource;
  onEdit: () => void;
};

/**
 * One source of income on the standard list row: who pays, how, the amount at the right end ("igual
 * ao último recebido" as its reference) and when it lands. The name and the "…" menu open the
 * recurrence to edit.
 */
export function IncomeSourceRow({ source, onEdit }: IncomeSourceRowProps) {
  const details = [
    source.counterparty && source.counterparty !== source.name ? source.counterparty : null,
    describeDateRule(source.dateRule),
    source.nextExpectedOn ? `próximo: ${formatShortDay(source.nextExpectedOn)}` : null,
    source.amountMode === 'last_received' ? 'igual ao último recebido' : null,
  ].filter((part): part is string => part !== null);

  return (
    <ListRow
      mark={<CategoryIcon icon="salary" type="income" />}
      name={source.name}
      onOpen={onEdit}
      openLabel={`Editar ${source.name}`}
      badges={
        source.employmentRegime
          ? [
              <Chip key="regime" tone="accent">
                {EMPLOYMENT_REGIME_LABEL[source.employmentRegime]}
              </Chip>,
            ]
          : undefined
      }
      detail={details.join(' · ')}
      detailTitle={details.join(' · ')}
      value={
        <Money
          cents={source.expectedAmountCents}
          sign="none"
          signColumn
          weight="plain"
          tone="income"
          className="text-money-row"
        />
      }
      className="border-t border-line first:border-t-0"
      menu={
        <OverflowMenu
          label={`Ações de ${source.name}`}
          items={[{ key: 'edit', label: 'Editar', icon: 'edit' }]}
          onAction={onEdit}
        />
      }
    />
  );
}
