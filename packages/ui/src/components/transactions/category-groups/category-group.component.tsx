import { useId } from 'react';
import { Button as AriaButton } from 'react-aria-components';

import { Button } from '#/components/buttons/index.ts';
import { VariationBadge } from '#/components/chips/index.ts';
import { Collapse } from '#/components/disclosure/index.ts';
import { Icon } from '#/components/icons/index.ts';
import { CategoryIcon } from '#/components/icons/index.ts';
import { Money } from '#/components/money/index.ts';
import { CategoryGroupItems } from '#/components/transactions/category-groups/category-group-items.component.tsx';
import type { CategoryGroupData } from '#/components/transactions/category-groups/category-group.type.ts';
import { countLabel } from '#/utils/count-label.util.ts';
import { cx } from '#/utils/class-names.util.ts';

const percentFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

type CategoryGroupProps = {
  group: CategoryGroupData;
  /** Expense lists show "−"; income lists show "+" and read a rise as good news. */
  kind: 'expense' | 'income';
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  /** "Ver as N transações na lista". */
  onSeeAll?: (id: string) => void;
  /** "Revisar", only on the uncategorized group. */
  onReview?: () => void;
  className?: string;
};

/**
 * One category of the "por categoria" view (components.md 6.2): icon, name with a chevron that
 * turns on open, share bar (4 px, at most 360 wide), value and variation. Open, it lists the last
 * transactions in a subtle box with the link to the list, which opens with the system `Collapse`
 * (height and opacity).
 */
export function CategoryGroup({
  group,
  kind,
  expanded,
  onExpandedChange,
  onSeeAll,
  onReview,
  className,
}: CategoryGroupProps) {
  const expandable = Boolean(group.items?.length) && !group.uncategorized;
  const isOpen = expandable && expanded;
  const panelId = useId();
  const detail =
    group.detail ??
    `${countLabel(group.count, 'transação', 'transações')} • ${percentFormat.format(group.sharePercent)}%`;
  const trigger = (
    <>
      <span className="text-body font-emphasis text-fg-primary">{group.name}</span>
      {expandable ? (
        <Icon
          name="chevron-down"
          size="sm"
          className={cx(
            'text-fg-secondary transition-transform duration-(--duration-fast) motion-reduce:transition-none',
            isOpen && 'rotate-180',
          )}
        />
      ) : null}
    </>
  );

  return (
    <div className={cx('border-b border-line last:border-b-0', className)}>
      <div className="flex items-start gap-s12 py-s12 lg:gap-s16 lg:py-s16">
        <CategoryIcon icon={group.icon} dashed={group.uncategorized} />
        <div className="flex min-w-0 flex-1 flex-col gap-s4">
          {expandable ? (
            <AriaButton
              aria-expanded={isOpen}
              aria-controls={panelId}
              onPress={() => onExpandedChange(!isOpen)}
              className="focus-ring -ml-s4 flex min-h-ctl-sm w-fit max-w-full cursor-pointer items-center gap-s8 rounded-input px-s4 text-left"
            >
              {trigger}
            </AriaButton>
          ) : (
            <span className="flex min-h-ctl-sm items-center gap-s8">{trigger}</span>
          )}
          <p className="text-meta text-fg-secondary lg:text-label">{detail}</p>
          <span
            aria-hidden="true"
            className="mt-s4 block h-1 w-full max-w-90 overflow-hidden rounded-capsule bg-track"
          >
            <span
              data-share={group.sharePercent}
              className={cx(
                'block h-full rounded-capsule',
                group.uncategorized ? 'bg-fg-tertiary opacity-60' : 'bg-brand',
              )}
              style={{ width: `${Math.min(Math.max(group.sharePercent, 0), 100)}%` }}
            />
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-s8">
          <Money
            cents={group.totalCents}
            sign={kind === 'income' ? 'plus' : 'minus'}
            weight="light"
            tone={kind === 'income' ? 'income' : 'inherit'}
            className="text-money-row"
          />
          {group.uncategorized && onReview ? (
            <Button variant="secondary" size="sm" onPress={onReview}>
              Revisar
            </Button>
          ) : group.caption ? (
            <span className="text-meta text-fg-secondary">{group.caption}</span>
          ) : group.variationPercent !== undefined ? (
            <VariationBadge percent={group.variationPercent} risingIsGood={kind === 'income'} />
          ) : null}
        </div>
      </div>
      {expandable ? (
        <Collapse isOpen={isOpen} id={panelId}>
          <CategoryGroupItems
            items={group.items ?? []}
            kind={kind}
            totalCount={group.count}
            onSeeAll={onSeeAll ? () => onSeeAll(group.id) : undefined}
          />
        </Collapse>
      ) : null}
    </div>
  );
}
