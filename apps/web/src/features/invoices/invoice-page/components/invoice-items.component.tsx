import {
  Button,
  Chip,
  Collapse,
  EmptyState,
  SearchField,
  SegmentedControl,
  Section,
} from '@fincheck/ui';
import { useState } from 'react';

import { InvoiceItemList } from '#/features/invoices/invoice-page/components/invoice-item-list.component.tsx';
import { countWord } from '#/shared/utils/text/count-word.util.ts';
import { INVOICE_SORT_OPTIONS } from '#/features/invoices/invoice-page/constants/invoice-sort-options.constant.ts';
import type {
  InvoiceItemGroupData,
  InvoiceSortKey,
} from '#/features/invoices/invoice-page/types/invoice-page.type.ts';

type InvoiceItemsProps = {
  groups: readonly InvoiceItemGroupData[];
  /** Lines of the invoice before any filter: zero means the invoice is empty. */
  totalCount: number;
  /** Lines that pass the filters. */
  shownCount: number;
  searchText: string;
  onSearchTextChange: (text: string) => void;
  sort: InvoiceSortKey;
  onSortChange: (sort: InvoiceSortKey) => void;
  /** The category the list is filtered to; null when it is not. */
  categoryName: string | null;
  onClearCategory: () => void;
  /** What an empty invoice says: a projected one has nothing yet. */
  emptyDescription: string;
};

/**
 * "Lançamentos": search, the order (by date or by value), the filter state of the category and the
 * lines in the blocks of Transações. Its own empty states: an invoice with nothing, and filters
 * that match nothing.
 */
export function InvoiceItems({
  groups,
  totalCount,
  shownCount,
  searchText,
  onSearchTextChange,
  sort,
  onSortChange,
  categoryName,
  onClearCategory,
  emptyDescription,
}: InvoiceItemsProps) {
  // Keeps the name while the chip closes, so the text does not vanish before the height does.
  const [shownName, setShownName] = useState('');
  if (categoryName && categoryName !== shownName) setShownName(categoryName);
  const filtering = categoryName !== null || searchText.trim() !== '';

  if (totalCount === 0) {
    return (
      <Section title="Lançamentos" variant="glass">
        <EmptyState
          icon="receipt"
          title="Nenhum lançamento nesta fatura"
          description={emptyDescription}
          headingLevel={3}
        />
      </Section>
    );
  }

  return (
    <Section
      title="Lançamentos"
      variant="glass"
      action={
        <span className="text-meta text-fg-secondary tabular-nums">
          {shownCount === totalCount
            ? countWord(totalCount, 'lançamento', 'lançamentos')
            : `${shownCount} de ${totalCount}`}
        </span>
      }
    >
      <div className="flex flex-col gap-s12 lg:flex-row lg:items-center">
        <SearchField
          label="Buscar lançamento"
          value={searchText}
          onChange={onSearchTextChange}
          className="lg:flex-1"
        />
        <SegmentedControl
          label="Ordem dos lançamentos"
          options={INVOICE_SORT_OPTIONS}
          value={sort}
          onChange={(key) => onSortChange(key as InvoiceSortKey)}
        />
      </div>
      <Collapse isOpen={categoryName !== null} trackClassName="-mt-s16" contentClassName="pt-s16">
        <div className="flex flex-wrap items-center gap-s8">
          <Chip tone="accent" large>
            Só {shownName}
          </Chip>
          <Button variant="tertiary" size="sm" onPress={onClearCategory}>
            Limpar filtro
          </Button>
        </div>
      </Collapse>

      {shownCount === 0 && filtering ? (
        <p className="py-s16 text-label text-fg-secondary">Nenhum lançamento com esses filtros.</p>
      ) : (
        <InvoiceItemList groups={groups} />
      )}
    </Section>
  );
}
