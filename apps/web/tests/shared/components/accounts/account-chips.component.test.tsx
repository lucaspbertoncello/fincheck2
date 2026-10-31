import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { AccountChips } from '#/shared/components/accounts/account-chips.component.tsx';
import type { AccountChipOption } from '#/shared/components/accounts/account-chips.component.tsx';

const ACCOUNTS: AccountChipOption[] = [
  { key: 'a', label: 'Nubank', theme: 'nubank' },
  { key: 'b', label: 'Carteira', theme: 'wallet' },
];

function Harness({ accounts = ACCOUNTS }: { accounts?: AccountChipOption[] }) {
  const [value, setValue] = useState<string | null>(null);
  return <AccountChips label="Conta" accounts={accounts} value={value} onChange={setValue} />;
}

describe('AccountChips', () => {
  it('shows a chip per account, each with its mark, and picks one with a tap', async () => {
    render(<Harness />);

    const nubank = screen.getByRole('radio', { name: 'Nubank' });
    expect(nubank.closest('label')?.querySelector('svg')).not.toBeNull();
    expect(
      screen.getByRole('radio', { name: 'Carteira' }).closest('label')?.querySelector('svg'),
    ).not.toBeNull();

    await userEvent.click(screen.getByText('Carteira'));

    expect(screen.getByRole('radio', { name: 'Carteira' })).toBeChecked();
  });

  it('turns into a list from the seventh account on', () => {
    const many = Array.from({ length: 7 }, (_, index) => ({
      key: String(index),
      label: `Conta ${index}`,
      theme: 'fallback' as const,
    }));

    render(<Harness accounts={many} />);

    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByRole('button', { name: /Conta/ })).toBeInTheDocument();
  });
});
