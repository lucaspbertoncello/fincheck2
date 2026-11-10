import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { InstallmentPlansView } from '#/features/transactions/installment-plans/installment-plans.view.tsx';
import type { InstallmentPlansViewProps } from '#/features/transactions/installment-plans/types/installment-plans.type.ts';

// The dialog fades out after its target is gone: here it is always drawn, so the text it holds on the
// way out can be read (the real one leaves the tree at once in jsdom).
vi.mock('@fincheck/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ConfirmDialog: ({ description }: { description: string }) => (
    <p data-testid="delete-text">{description}</p>
  ),
}));
vi.mock('#/shared/components/page/back-page-frame.component.tsx', () => ({
  BackPageFrame: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const noop = () => undefined;

function props(deleteTarget: InstallmentPlansViewProps['deleteTarget']): InstallmentPlansViewProps {
  return {
    state: 'ready',
    title: 'Compras parceladas',
    description: '',
    backHref: '/accounts',
    backLabel: 'Contas e cartões',
    onRetry: noop,
    onBack: noop,
    onCreate: noop,
    actionError: null,
    onDismissActionError: noop,
    active: [],
    settled: [],
    onEdit: noop,
    onDelete: noop,
    deleteTarget,
    deleting: false,
    onConfirmDelete: noop,
    onCancelDelete: noop,
  };
}

describe('InstallmentPlansView, delete dialog', () => {
  it('keeps the count of the last target while the dialog leaves, never "As 0 parcelas"', () => {
    const { rerender } = render(
      <InstallmentPlansView {...props({ name: 'Tênis de corrida', installmentCount: 4 })} />,
    );
    expect(screen.getByTestId('delete-text')).toHaveTextContent('As 4 parcelas somem das faturas');

    rerender(<InstallmentPlansView {...props(null)} />);

    expect(screen.getByTestId('delete-text')).toHaveTextContent('As 4 parcelas somem das faturas');
    expect(screen.getByTestId('delete-text')).not.toHaveTextContent('As 0 parcelas');
  });
});
