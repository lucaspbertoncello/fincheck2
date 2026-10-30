import { cx } from '#/utils/class-names.util.ts';

/** Round dashed "+" that opens every "Nova ..." row (40 px by default). Decorative. */
export function PlusMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'grid size-10 shrink-0 place-items-center rounded-capsule border border-dashed border-brand text-brand',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-icon" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
