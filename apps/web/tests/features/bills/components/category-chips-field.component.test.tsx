import type { CategoryOption } from '@fincheck/ui';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { CategoryChipsField } from '#/features/bills/components/category-chips-field.component.tsx';

const CATEGORIES: CategoryOption[] = [
  { id: 'none', name: 'Sem categoria', icon: 'tag' },
  { id: 'a', name: 'Mercado', icon: 'cart' },
  { id: 'b', name: 'Moradia', icon: 'home' },
  { id: 'c', name: 'Saúde', icon: 'health' },
  { id: 'd', name: 'Lazer', icon: 'fun' },
  { id: 'e', name: 'Transporte', icon: 'car' },
  { id: 'f', name: 'Educação', icon: 'book' },
];

function Harness() {
  const [value, setValue] = useState('none');
  return (
    <CategoryChipsField
      label="Categoria"
      categories={CATEGORIES}
      noneId="none"
      value={value}
      onChange={setValue}
    />
  );
}

describe('CategoryChipsField', () => {
  it('shows five categories as chips, hides "Sem categoria" and offers "Outras…"', () => {
    render(<Harness />);

    expect(screen.getByRole('button', { name: 'Mercado' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Transporte' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Educação' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sem categoria' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Outras…' })).toBeInTheDocument();
  });

  it('chooses a chip and clears it by tapping again', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Saúde' }));
    expect(screen.getByRole('button', { name: 'Saúde' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Saúde' }));
    expect(screen.getByRole('button', { name: 'Saúde' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('keeps a category chosen from "Outras…" visible as a chip', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Outras…' }));
    await user.type(await screen.findByRole('combobox', { name: 'Buscar categoria' }), 'Edu');
    await user.click(await screen.findByRole('option', { name: 'Educação' }));

    expect(await screen.findByRole('button', { name: 'Educação' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
