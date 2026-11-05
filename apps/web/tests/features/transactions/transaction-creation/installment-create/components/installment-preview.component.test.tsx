import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { InstallmentPreview } from '#/features/transactions/transaction-creation/installment-create/components/installment-preview.component.tsx';
import { buildInstallmentPreview } from '#/features/transactions/transaction-creation/installment-create/utils/build-installment-preview.util.ts';

function renderPreview(total: number, count: number) {
  const preview = buildInstallmentPreview(total, count, '2026-11');
  if (!preview) throw new Error('The preview should exist');
  render(<InstallmentPreview preview={preview} />);
}

describe('InstallmentPreview', () => {
  it('says "10× de R$ 89,90" and where the first and last land', () => {
    renderPreview(89900, 10);

    const region = screen.getByRole('region', { name: 'Prévia das parcelas' });
    expect(region).toHaveTextContent('10×deR$89,90');
    expect(region).toHaveTextContent('A 1ª na fatura de novembro 2026, a última em agosto 2027');
    expect(region).toHaveTextContent('R$899,00');
  });

  it('says so when the cents do not divide evenly', () => {
    renderPreview(100000, 12);

    expect(screen.getByRole('region')).toHaveTextContent('1×deR$83,37e11×deR$83,33');
  });

  it('lists every installment on "Ver parcelas" and hides them again', async () => {
    const user = userEvent.setup();
    renderPreview(30000, 3);

    expect(screen.queryByText(/1\/3/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ver parcelas' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await user.click(screen.getByRole('button', { name: 'Ver parcelas' }));
    expect(screen.getByRole('button', { name: 'Ocultar' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText(/1\/3 · fatura de novembro 2026/)).toBeInTheDocument();
    expect(screen.getByText(/3\/3 · fatura de janeiro 2027/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ocultar' }));
    // Folding: the list stays until the height has gone, but leaves the accessibility tree at once.
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
