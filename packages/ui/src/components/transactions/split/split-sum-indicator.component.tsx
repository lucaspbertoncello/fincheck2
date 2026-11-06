import { Icon } from '#/components/icons/index.ts';
import { Money } from '#/components/money/index.ts';
import type { SplitStatus } from '#/components/transactions/split/split-status.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type SplitSumIndicatorProps = {
  /** Ready from the split rule: whether the parts close the total. */
  status: SplitStatus;
  /** Total minus the sum of the parts: positive when short, negative when over. */
  differenceCents: number;
  className?: string;
};

/**
 * Sum indicator of the split (components.md 6.1): "Soma confere" on green, or how much is left or
 * over on amber. Polite live region, so the change is announced as parts are typed.
 */
export function SplitSumIndicator({ status, differenceCents, className }: SplitSumIndicatorProps) {
  const matches = status === 'matches';

  return (
    <p
      role="status"
      data-status={status}
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
          {status === 'short' ? 'Faltam ' : 'Passou '}
          <Money
            cents={Math.abs(differenceCents)}
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
