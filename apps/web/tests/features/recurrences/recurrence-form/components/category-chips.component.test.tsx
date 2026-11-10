import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { CategoryOption } from '@fincheck/ui';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';
import { CategoryChips } from '#/features/recurrences/recurrence-form/components/category-chips.component.tsx';

vi.setConfig({ testTimeout: 30_000 });
resetDatabaseBeforeEach();

const CATEGORIES: CategoryOption[] = [
  { id: 'a', name: 'Moradia', icon: 'cart' },
  { id: 'b', name: 'Internet', icon: 'cart' },
  { id: 'c', name: 'Saúde', icon: 'cart' },
];

function Harness({
  list = CATEGORIES,
  kind = 'expense',
}: {
  list?: CategoryOption[];
  kind?: Category.Kind;
}) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <>
      <CategoryChips
        label="Categoria"
        kind={kind}
        categories={list}
        value={value}
        onChange={setValue}
      />
      <output aria-label="chosen">{value ?? ''}</output>
    </>
  );
}

function renderChips(props: Parameters<typeof Harness>[0] = {}) {
  const { wrapper } = createQueryWrapper();
  return render(<Harness {...props} />, { wrapper });
}

describe('CategoryChips of the recurrence form', () => {
  it('creates from the typed name, of the type of the recurrence, and chooses the new category', async () => {
    const user = userEvent.setup();
    renderChips({ kind: 'income' });

    await user.click(screen.getByRole('radio', { name: 'Outras…' }));
    await user.type(
      await screen.findByRole('combobox', { name: 'Buscar outra categoria' }),
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

  it('with no category of the type yet, the field still offers to create the first one', async () => {
    const user = userEvent.setup();
    renderChips({ list: [] });

    expect(screen.getByText('Nenhuma categoria deste tipo ainda.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Nova categoria' }));

    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });
    expect(within(dialog).getByRole('textbox', { name: 'Nome' })).toHaveValue('');
    await user.type(within(dialog).getByRole('textbox', { name: 'Nome' }), 'Contas da casa');
    await user.click(within(dialog).getByRole('button', { name: 'Criar categoria' }));

    await waitFor(() =>
      expect(db.categories.some((category) => category.name === 'Contas da casa')).toBe(true),
    );
    const created = db.categories.find((category) => category.name === 'Contas da casa');
    await waitFor(() =>
      expect(screen.getByLabelText('chosen')).toHaveTextContent(created?.id ?? 'missing'),
    );
  });
});
