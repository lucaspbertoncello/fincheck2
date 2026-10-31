import type { PreviewTile } from '#/features/recurrences/recurrence-list/recurrence-form/types/preview-tile.type.ts';

type NextDatesTrailProps = {
  tiles: readonly PreviewTile[];
};

/**
 * The proof of the rule: the next three dates as tiles, weekday and month small around a big day.
 * The first one (the next to come) takes the weak accent fill. The strip keeps its height while
 * the rule is incomplete, with a quiet line instead, so the modal never jumps.
 */
export function NextDatesTrail({ tiles }: NextDatesTrailProps) {
  return (
    <div className="flex flex-col">
      <p className="sr-only">Próximas datas</p>
      {tiles.length === 0 ? (
        <p className="flex min-h-12 items-center rounded-input border border-dashed border-line px-s12 text-meta text-fg-tertiary">
          Complete a regra e as próximas datas aparecem aqui.
        </p>
      ) : (
        <ul aria-label="Próximas datas" className="grid grid-cols-3 gap-s8">
          {tiles.map((tile, index) => (
            <li
              key={tile.key}
              aria-label={tile.label}
              className={`flex min-h-12 flex-col items-center justify-center rounded-input border px-s4 py-s4 leading-tight ${
                index === 0 ? 'border-brand bg-brand-weak' : 'border-line bg-subtle'
              }`}
            >
              <span
                aria-hidden="true"
                className="text-money-sm leading-none font-numeric text-fg-primary tabular-nums"
              >
                {tile.day}
              </span>
              <span aria-hidden="true" className="mt-s4 text-meta text-fg-secondary">
                {tile.weekday ? `${tile.weekday} · ${tile.month}` : tile.month}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
