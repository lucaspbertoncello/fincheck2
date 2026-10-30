import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { InstallmentCountField } from '#/features/transactions/transaction-creation/installment-create/components/installment-count-field.component.tsx';

function Harness({ initial = '2' }: { initial?: string }) {
  const [count, setCount] = useState(initial);
  return <InstallmentCountField countText={count} onChange={setCount} />;
}

describe('InstallmentCountField', () => {
  it('picks a usual count with one tap', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByRole('button', { name: '2 parcelas' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: '10 parcelas' }));
    expect(screen.getByRole('button', { name: '10 parcelas' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: '2 parcelas' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('"Outro" opens an empty number field, so the digits typed are the whole count', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Outro' }));
    const field = screen.getByRole('textbox', { name: 'Número de parcelas' });
    expect(field).toHaveValue('');
    await user.type(field, '18');
    expect(field).toHaveValue('18');
    expect(screen.getByRole('button', { name: '2 parcelas' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('starts on "Outro" when the count is not one of the usual ones', () => {
    render(<Harness initial="18" />);

    expect(screen.getByRole('textbox', { name: 'Número de parcelas' })).toHaveValue('18');
  });
});
