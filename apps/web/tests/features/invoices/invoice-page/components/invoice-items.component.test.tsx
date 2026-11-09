import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InvoiceItems } from '#/features/invoices/invoice-page/components/invoice-items.component.tsx';

function renderItems(totalCount: number) {
  render(
    <InvoiceItems
      groups={[]}
      totalCount={totalCount}
      shownCount={totalCount}
      searchText=""
      onSearchTextChange={() => undefined}
      sort="date"
      onSortChange={() => undefined}
      categoryName={null}
      onClearCategory={() => undefined}
      emptyDescription="Nada"
    />,
  );
}

describe('InvoiceItems', () => {
  it('writes the count in the singular for one line and in the plural for more', () => {
    renderItems(1);
    expect(screen.getByText('1 lançamento')).toBeInTheDocument();
  });

  it('uses the plural from two lines on', () => {
    renderItems(3);
    expect(screen.getByText('3 lançamentos')).toBeInTheDocument();
  });
});
