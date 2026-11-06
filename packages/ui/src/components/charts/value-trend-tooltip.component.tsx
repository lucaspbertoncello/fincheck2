import type { ValueTrendPoint } from '#/components/charts/value-trend-point.type.ts';

type ValueTrendTooltipCardProps = {
  point: ValueTrendPoint;
  valueLabel: string;
  /** The value written the way the page writes it ("2,5 MB"). */
  valueText: string;
};

/** The dark tip of the value trend: the moment, and what the line measures with its value. */
export function ValueTrendTooltipCard({
  point,
  valueLabel,
  valueText,
}: ValueTrendTooltipCardProps) {
  return (
    <div className="flex flex-col gap-s4 rounded-input bg-fg-primary px-s12 py-s8 text-meta whitespace-nowrap text-page">
      <span className="font-emphasis">{point.fullLabel}</span>
      <span className="flex justify-between gap-s16 tabular-nums">
        {valueLabel}
        <span>{valueText}</span>
      </span>
    </div>
  );
}
