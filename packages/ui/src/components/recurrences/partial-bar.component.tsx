import { ProgressBar } from 'react-aria-components';

type PartialBarProps = {
  paidCents: number;
  totalCents: number;
  /** Accessible name ("Recebido da Mesada"). The value read is the percentage, never the amount. */
  label: string;
  className?: string;
};

/** Progress of a partial payment: 96 × 6 track with the paid share filled (components.md 10.2). */
export function PartialBar({ paidCents, totalCents, label, className }: PartialBarProps) {
  const percent = totalCents > 0 ? Math.min(100, Math.max(0, (paidCents / totalCents) * 100)) : 0;

  return (
    <ProgressBar aria-label={label} value={percent} className={className ?? 'w-24'}>
      <div className="h-1.5 overflow-hidden rounded-capsule bg-track">
        <div className="h-full rounded-capsule bg-brand" style={{ width: `${percent}%` }} />
      </div>
    </ProgressBar>
  );
}
