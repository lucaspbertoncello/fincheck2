import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InvoicePageSkeleton } from '#/features/invoices/invoice-page/components/invoice-page-skeleton.component.tsx';
import { INVOICE_GRID_CLASS } from '#/features/invoices/invoice-page/constants/invoice-grid-class.constant.ts';

describe('InvoicePageSkeleton', () => {
  it('lays the boxes on the one grid of the page: the top row and the highlights row', () => {
    render(<InvoicePageSkeleton card={null} />);

    const skeleton = screen.getByLabelText('Carregando a fatura');
    const rows = Array.from(skeleton.children).filter(
      (child) => child.className === INVOICE_GRID_CLASS,
    );

    expect(rows).toHaveLength(2);
    // Card and summary on top, "Destaques" and "Para onde foi" below.
    expect(rows[0]?.children).toHaveLength(2);
    expect(rows[1]?.children).toHaveLength(2);
  });
});
