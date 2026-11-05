import { Icon } from '#/components/icons/index.ts';
import { Money } from '#/components/money/index.ts';
import type { SplitCheck } from '#/components/transactions/split/split-check.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type SplitSumIndicatorProps = {
  check: SplitCheck;
  className?: string;
};

/**
 * Sum indicator of the split (components.md 6.1): "Soma confere" on green, or how much is left or
 * over on amber. Polite live region, so the change is announced as parts are typed.
 */
export function SplitSumIndicator({ check, className }: SplitSumIndicatorProps) {
  const matches = check.status === 'matches';

  return (
    <p
      role="status"
      data-status={check.status}
      className={cx(
        'flex items-center gap-s8 rounded-input px-s12 py-s8 text-label',
        matches ? 'bg-gain-weak text-fg-primary' : 'bg-caution-weak text-fg-primary',
        className,
      )}
    >
      <Icon
        name={matches ? 'check' : 'warning'}
        size="md"
        className={matches ? 'text-gain' : 'text-caution'}
      />
      {matches ? (
        <span>Soma confere</span>
      ) : (
        <span>
          {check.status === 'short' ? 'Faltam ' : 'Passou '}
          <Money
            cents={Math.abs(check.differenceCents)}
            sign="none"
            weight="emphasis"
            className="text-label"
          />{' '}
          para fechar o total
        </span>
      )}
    </p>
  );
}
