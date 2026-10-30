import { cx } from '#/utils/class-names.util.ts';

type CountBadgeProps = {
  count: number;
  className?: string;
};

/** Counter pill, 20 px tall ("12" next to "Para revisar"). */
export function CountBadge({ count, className }: CountBadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-capsule bg-brand-weak px-s8 text-caption font-emphasis text-brand tabular-nums',
        className,
      )}
    >
      {count}
    </span>
  );
}
