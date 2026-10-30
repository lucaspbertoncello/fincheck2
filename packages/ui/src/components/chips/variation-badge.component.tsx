import { variationTone, type VariationTone } from '#/components/chips/variation-tone.util.ts';
import { cx } from '#/utils/class-names.util.ts';

const percentFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

const TONE_CLASS: Record<VariationTone, Record<'loss' | 'caution', string>> = {
  neutral: { loss: 'bg-subtle text-fg-secondary', caution: 'bg-subtle text-fg-secondary' },
  bad: { loss: 'bg-loss-weak text-loss', caution: 'bg-caution-weak text-caution' },
  good: { loss: 'bg-gain-weak text-gain', caution: 'bg-gain-weak text-gain' },
};

type VariationBadgeProps = {
  /** Signed percent: 9.9 is a rise of 9.9%, -12 a fall of 12%. */
  percent: number;
  /** True for income, where a rise is good news. Spending (default) is the opposite. */
  risingIsGood?: boolean;
  /** Color of a bad variation: "loss" (red, summary card) or "caution" (amber, donut legend). */
  badTone?: 'loss' | 'caution';
  className?: string;
};

/**
 * Variation badge: triangle plus percent. Gray under 10%; from 10% the color reinforces it
 * (ui adjustment 4). The rule lives here, so screens only pass the number.
 */
export function VariationBadge({
  percent,
  risingIsGood = false,
  badTone = 'loss',
  className,
}: VariationBadgeProps) {
  const tone = variationTone(percent, risingIsGood);
  const arrow = percent > 0 ? '▲' : percent < 0 ? '▼' : '';
  const spoken = percent > 0 ? 'Alta de ' : percent < 0 ? 'Queda de ' : '';

  return (
    <span
      data-tone={tone}
      className={cx(
        'inline-flex items-center gap-s4 rounded-capsule px-s8 py-s4 text-meta font-emphasis whitespace-nowrap tabular-nums',
        TONE_CLASS[tone][badTone],
        className,
      )}
    >
      {arrow ? (
        <span aria-hidden="true" className="text-caption">
          {arrow}
        </span>
      ) : null}
      {spoken ? <span className="sr-only">{spoken}</span> : null}
      {percentFormat.format(Math.abs(percent))}%
    </span>
  );
}
