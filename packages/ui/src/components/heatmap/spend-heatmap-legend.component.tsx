import {
  HEATMAP_LEVELS,
  HEATMAP_LEVEL_CLASS,
} from '#/components/heatmap/heatmap-level.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

/** "Menos ▢ ▢ ▢ ▢ ▢ Mais": the five fills in words, so the scale never depends on color alone. */
export function SpendHeatmapLegend({ className }: { className?: string }) {
  return (
    <div
      className={cx('flex items-center gap-s8 text-meta text-fg-secondary', className)}
      role="img"
      aria-label="Escala de gasto, de menos a mais: sem gasto e quatro faixas"
    >
      <span aria-hidden="true">Menos</span>
      <span aria-hidden="true" className="flex gap-s4">
        {HEATMAP_LEVELS.map((level) => (
          <span key={level} className={cx('size-s12 rounded-mini', HEATMAP_LEVEL_CLASS[level])} />
        ))}
      </span>
      <span aria-hidden="true">Mais</span>
    </div>
  );
}
