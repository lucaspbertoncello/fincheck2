import { formatHeatmapDayShort } from '#/components/heatmap/format-heatmap-day-short.util.ts';
import { formatMoneyParts } from '#/components/money/format-money-parts.util.ts';
import { maskMoneyText } from '#/components/money/mask-money-text.util.ts';
import { useMoneyHidden } from '#/components/money/money-visibility.context.ts';
import { FloatingTip } from '#/components/overlays/floating-tip.component.tsx';

type SpendHeatmapTipProps = {
  /** The square of the day the tip points at. */
  anchor: HTMLElement;
  date: string;
  totalCents: number;
  /** Today (`YYYY-MM-DD`), so a day from another year shows its year. */
  today?: string;
};

function tipValue(totalCents: number, hidden: boolean): string {
  if (totalCents <= 0) return 'Sem gastos';
  const value = `R$ ${formatMoneyParts(totalCents)}`;
  return hidden ? maskMoneyText(value) : value;
}

/**
 * The tip of a day of the spend map, on one line: "R$ 20,02 · seg., 9 nov.". It is a `FloatingTip`,
 * so it is drawn over the page and never cut by the box of the map. Hidden values keep the shape
 * and drop the digits.
 */
export function SpendHeatmapTip({ anchor, date, totalCents, today }: SpendHeatmapTipProps) {
  const hidden = useMoneyHidden();

  return (
    <FloatingTip anchor={anchor}>
      <span className="font-emphasis tabular-nums">{tipValue(totalCents, hidden)}</span>
      {' · '}
      <span>{formatHeatmapDayShort(date, today)}</span>
    </FloatingTip>
  );
}
