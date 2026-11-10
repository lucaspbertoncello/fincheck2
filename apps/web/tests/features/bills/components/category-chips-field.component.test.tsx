import type { CategoryOption } from '@fincheck/ui';
import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

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

vi.setConfig({ testTimeout: 30_000 });
resetDatabaseBeforeEach();

function Harness({
  list = CATEGORIES,
  kind = 'expense',
}: {
  list?: CategoryOption[];
  kind?: Category.Kind;
}) {
  const [value, setValue] = useState('none');
  const [{ wrapper }] = useState(createQueryWrapper);
  return (
    <>
      {wrapper({
        children: (
          <CategoryChipsField
            label="Categoria"
            categories={list}
            noneId="none"
            newCategoryKind={kind}
            value={value}
            onChange={setValue}
          />
        ),
      })}
      <output aria-label="chosen">{value}</output>
    </>
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

  it('always offers "Outras…", since the search is where a new category is created', () => {
    render(<Harness list={CATEGORIES.slice(0, 3)} />);

    expect(screen.getByRole('button', { name: 'Outras…' })).toBeInTheDocument();
  });

  it('creates a category from the typed name, of the type of the bill, and chooses it', async () => {
    const user = userEvent.setup();
    render(<Harness kind="income" />);

    await user.click(screen.getByRole('button', { name: 'Outras…' }));
    await user.type(
      await screen.findByRole('combobox', { name: 'Buscar categoria' }),
      'Aluguel de sala',
    );
    await user.click(
      await screen.findByRole('option', { name: 'Criar categoria "Aluguel de sala"' }),
    );

    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });
    expect(within(dialog).getByRole('textbox', { name: 'Nome' })).toHaveValue('Aluguel de sala');
    expect(within(dialog).queryByRole('radio', { name: 'Despesa' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Criar categoria' }));

    await waitFor(() =>
      expect(db.categories.some((category) => category.name === 'Aluguel de sala')).toBe(true),
    );
    const created = db.categories.find((category) => category.name === 'Aluguel de sala');
    expect(created?.kind).toBe('income');
    await waitFor(() =>
      expect(screen.getByLabelText('chosen')).toHaveTextContent(created?.id ?? 'missing'),
    );
  });
});
