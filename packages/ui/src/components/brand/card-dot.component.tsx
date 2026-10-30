import { cx } from '#/utils/class-names.util.ts';

type CardDotProps = {
  className?: string;
};

/** The mini card in gradient that comes before every page title (components.md 1.4). */
export function CardDot({ className }: CardDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-block h-1.75 w-2.5 -rotate-8 rounded-(--radius-pingo) bg-(image:--gradient-pingo) lg:h-2 lg:w-3',
        className,
      )}
    />
  );
}
