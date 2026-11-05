import type { ReactNode } from 'react';

type HeatmapStatProps = {
  label: string;
  value: ReactNode;
  /** Line under the value: the date of the biggest day, the size of the period. */
  hint?: string;
};

/** One figure of the text summary beside the map. */
export function HeatmapStat({ label, value, hint }: HeatmapStatProps) {
  return (
    <div className="flex min-w-0 flex-col gap-s4">
      <dt className="text-meta text-fg-secondary">{label}</dt>
      <dd className="flex flex-col gap-s4 text-money-sm text-fg-primary">
        {value}
        {hint ? <span className="text-meta text-fg-secondary">{hint}</span> : null}
      </dd>
    </div>
  );
}
