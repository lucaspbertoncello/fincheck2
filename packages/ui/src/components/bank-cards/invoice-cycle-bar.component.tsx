type InvoiceCycleBarProps = {
  /** From 0 (the cycle just opened) to 1 (closing day). */
  progress: number;
};

/** Cycle bar of the invoice: 6 px pill, accent over the grid color (components.md 3.4). */
export function InvoiceCycleBar({ progress }: InvoiceCycleBarProps) {
  const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <div
      role="progressbar"
      aria-label="Ciclo da fatura"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-1.5 w-full overflow-hidden rounded-capsule bg-(--color-chart-grid)"
    >
      <div className="h-full rounded-capsule bg-brand" style={{ width: `${percent}%` }} />
    </div>
  );
}
