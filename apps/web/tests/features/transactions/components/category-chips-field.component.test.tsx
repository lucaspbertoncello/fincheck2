import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { CategoryChipsField } from '#/features/transactions/components/category-chips-field.component.tsx';

const NAMES = ['Mercado', 'Restaurantes', 'Transporte', 'Saúde', 'Lazer', 'Moradia', 'Pets'];
const categories = NAMES.map((name, index) => ({ id: `c${index}`, name, icon: 'cart' as const }));

function Harness({ list = categories }: { list?: typeof categories }) {
  const [value, setValue] = useState<string | null>(null);
  return <CategoryChipsField categories={list} value={value} onChange={setValue} />;
}

describe('CategoryChipsField', () => {
  it('shows the five most used as chips with "Outras…" for the rest', () => {
    render(<Harness />);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Mercado',
      'Restaurantes',
      'Transporte',
      'Saúde',
      'Lazer',
      'Outras…',
    ]);
  });

  it('shows every category and no search when there are six or fewer', () => {
    render(<Harness list={categories.slice(0, 6)} />);

    expect(screen.getByRole('button', { name: 'Moradia' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Outras/ })).not.toBeInTheDocument();
  });

  it('picks, and clears with a second tap on the chosen chip', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Saúde' }));
    expect(screen.getByRole('button', { name: 'Saúde' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Saúde' }));
    expect(screen.getByRole('button', { name: 'Saúde' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('a category found in the search takes the last chip, chosen', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: /Outras/ }));
    await user.type(screen.getByRole('combobox', { name: 'Buscar outra categoria' }), 'Pets');
    await user.click(await screen.findByRole('option', { name: 'Pets' }));

    expect(screen.getByRole('button', { name: 'Pets' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Lazer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
