type ReviewProgressProps = {
  /** Transactions already reviewed. */
  done: number;
  total: number;
};

/**
 * "3 de 12 revisadas" with its progress bar (components.md 11.1): a pill 8 px tall. The bar is a
 * `progressbar` for screen readers; the fill only changes width, no animation to reduce.
 */
export function ReviewProgress({ done, total }: ReviewProgressProps) {
  const percent = total > 0 ? Math.min(Math.round((done / total) * 100), 100) : 0;

  return (
    <div className="flex flex-col gap-s8">
      <p className="text-right text-meta text-fg-secondary tabular-nums lg:text-label">
        {done} de {total} revisadas
      </p>
      <div
        role="progressbar"
        aria-label="Progresso da revisão"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={`${done} de ${total} revisadas`}
        className="h-2 w-full overflow-hidden rounded-capsule bg-(--color-chart-bar)"
      >
        <div className="h-full rounded-capsule bg-brand" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
