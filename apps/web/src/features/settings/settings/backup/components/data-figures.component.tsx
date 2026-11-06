import { Skeleton } from '@fincheck/ui';

import type { DataFigureItem } from '#/features/settings/settings/backup/types/data-figure-item.type.ts';

type DataFiguresProps = {
  figures: DataFigureItem[];
  /** Draws the same four boxes as skeletons, so the page does not jump when the numbers arrive. */
  isLoading?: boolean;
};

const LOADING_LABELS = [
  'Tamanho do banco',
  'Transações guardadas',
  'Dados desde',
  'Contas e cartões',
];

/**
 * The four numbers of the database (BR-BKP-003): size, transactions kept, since when there is data,
 * accounts and cards. Four glass boxes, two by two on the phone and in a row from the desktop;
 * the value is the big line, the label above it and what it counts under it. Nothing wraps.
 */
export function DataFigures({ figures, isLoading = false }: DataFiguresProps) {
  return (
    <dl aria-busy={isLoading} className="m-0 grid grid-cols-2 gap-s12 lg:gap-s16 2xl:grid-cols-4">
      {isLoading
        ? LOADING_LABELS.map((label) => (
            <div key={label} className="glass flex min-w-0 flex-col gap-s8 p-s16 lg:p-s24">
              <dt className="text-label whitespace-nowrap text-fg-secondary">{label}</dt>
              <dd className="m-0">
                <Skeleton className="h-7 w-2/3" />
              </dd>
              <Skeleton className="h-3 w-full" />
            </div>
          ))
        : figures.map((figure) => (
            <div key={figure.label} className="glass flex min-w-0 flex-col gap-s8 p-s16 lg:p-s24">
              <dt className="truncate text-label text-fg-secondary">{figure.label}</dt>
              <dd className="m-0 font-title text-xl leading-(--line-height-title) font-heading whitespace-nowrap text-fg-primary tabular-nums">
                {figure.value}
              </dd>
              <dd className="m-0 truncate text-meta text-fg-secondary">{figure.caption}</dd>
            </div>
          ))}
    </dl>
  );
}
