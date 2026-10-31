import { cx } from '#/utils/class-names.util.ts';

type DayBarProps = {
  /** Segments in the bar (one per day of the window). */
  total: number;
  /** Segments already behind, painted in the accent. */
  elapsed: number;
  /** Text under the bar ("10 dias até o fim do mês"). */
  caption: string;
};

/** Bar of days: pill segments of 8 px, the past in the accent, the rest in its weak tone. */
export function DayBar({ total, elapsed, caption }: DayBarProps) {
  return (
    <div className="flex flex-col gap-s8">
      <div
        role="img"
        aria-label={`${elapsed} de ${total} ${total === 1 ? 'dia' : 'dias'} passados`}
        className="flex gap-s4"
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cx(
              'h-s8 flex-1 rounded-capsule',
              index < elapsed ? 'bg-brand' : 'bg-brand-weak',
            )}
          />
        ))}
      </div>
      <p className="text-meta text-fg-secondary">{caption}</p>
    </div>
  );
}
