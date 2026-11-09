import { Button, CategoryIcon, Collapse, Money, Section } from '@fincheck/ui';
import { useState } from 'react';

import type { InvoiceCategoryRowData } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';

/** Categories shown before "Ver todas": enough to read the page, short enough to keep it calm. */
const VISIBLE_ROWS = 6;

type InvoiceCategoryCompositionProps = {
  rows: readonly InvoiceCategoryRowData[];
  onToggle: (key: string) => void;
  onClear: () => void;
  className?: string;
};

type RowProps = {
  row: InvoiceCategoryRowData;
  dimmed: boolean;
  onToggle: (key: string) => void;
};

const ROW_CLASS =
  'grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-s12 rounded-input px-s8 py-s12 text-left transition-opacity duration-(--duration-fast)';

function CategoryRowBody({ row }: { row: InvoiceCategoryRowData }) {
  return (
    <>
      <CategoryIcon icon={row.icon} size="sm" />
      <span className="flex min-w-0 flex-col gap-s4">
        <span title={row.name} className="truncate text-body font-emphasis text-fg-primary">
          {row.name}
        </span>
        <span
          aria-hidden="true"
          className="block h-1.5 w-full overflow-hidden rounded-capsule bg-track"
        >
          <span
            className="block h-full rounded-capsule bg-brand"
            style={{ width: `${Math.max(2, row.share)}%` }}
          />
        </span>
        <span className="text-meta whitespace-nowrap text-fg-secondary">{row.countLabel}</span>
      </span>
      <span className="flex flex-col items-end gap-s4 text-right whitespace-nowrap">
        <Money
          cents={row.totalCents}
          sign="none"
          tone="expense"
          weight="plain"
          className="text-money-row"
        />
        <span className="text-meta text-fg-secondary tabular-nums">{row.shareLabel}</span>
      </span>
    </>
  );
}

function CategoryRow({ row, dimmed, onToggle }: RowProps) {
  // What was lent has no category to filter by: the line only tells how much it is.
  if (row.isLent) {
    return (
      <li>
        <div className={[ROW_CLASS, dimmed ? 'opacity-50' : ''].join(' ')}>
          <CategoryRowBody row={row} />
        </div>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        aria-pressed={row.selected}
        onClick={() => onToggle(row.key)}
        className={[
          'focus-ring cursor-pointer hover:bg-subtle',
          ROW_CLASS,
          row.selected ? 'bg-brand-weak hover:bg-brand-weak' : '',
          dimmed ? 'opacity-50' : '',
        ].join(' ')}
      >
        <CategoryRowBody row={row} />
      </button>
    </li>
  );
}

/**
 * "Para onde foi" (BR-INV-006): the categories of the invoice with their share, the biggest first.
 * Tapping one filters the lines below to it and tapping it again clears; while one is chosen the
 * others fade and the header offers "Limpar filtro".
 */
export function InvoiceCategoryComposition({
  rows,
  onToggle,
  onClear,
  className,
}: InvoiceCategoryCompositionProps) {
  const [expanded, setExpanded] = useState(false);
  const selected = rows.some((row) => row.selected);
  const shown = rows.slice(0, VISIBLE_ROWS);
  const rest = rows.slice(VISIBLE_ROWS);
  const open = expanded || rest.some((row) => row.selected);
  const dimOthers = (row: InvoiceCategoryRowData) => selected && !row.selected;

  return (
    <Section
      title="Para onde foi"
      variant="glass"
      className={className}
      action={
        selected ? (
          <Button variant="tertiary" size="sm" onPress={onClear}>
            Limpar filtro
          </Button>
        ) : (
          <span className="text-meta text-fg-secondary">Toque para filtrar</span>
        )
      }
    >
      <p className="m-0 text-meta text-fg-secondary">
        Das compras lançadas. Recorrências esperadas entram quando forem cobradas.
      </p>
      <ul className="m-0 flex list-none flex-col p-0">
        {shown.map((row) => (
          <CategoryRow key={row.key} row={row} dimmed={dimOthers(row)} onToggle={onToggle} />
        ))}
      </ul>
      {rest.length > 0 ? (
        <>
          <Collapse
            isOpen={open}
            id="invoice-more-categories"
            trackClassName="-mt-s16"
            contentClassName="pt-s16"
          >
            <ul className="m-0 flex list-none flex-col p-0">
              {rest.map((row) => (
                <CategoryRow key={row.key} row={row} dimmed={dimOthers(row)} onToggle={onToggle} />
              ))}
            </ul>
          </Collapse>
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            aria-expanded={open}
            aria-controls="invoice-more-categories"
            onPress={() => setExpanded(!open)}
          >
            {open ? 'Ver menos' : `Ver todas (${rows.length})`}
          </Button>
        </>
      ) : null}
    </Section>
  );
}
