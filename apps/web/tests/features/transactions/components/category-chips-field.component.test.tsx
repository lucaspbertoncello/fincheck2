import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';
import { CategoryChipsField } from '#/features/transactions/components/category-chips-field.component.tsx';

vi.setConfig({ testTimeout: 30_000 });
resetDatabaseBeforeEach();

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

const EXPENSE_GROUP = 'Abate gasto';
const INCOME_GROUP = 'Conta como receita';
const grouped = [
  ...NAMES.map((name, index) => ({
    id: `e${index}`,
    name,
    icon: 'cart' as const,
    group: EXPENSE_GROUP,
  })),
  { id: 'i0', name: 'Salário', icon: 'cart' as const, group: INCOME_GROUP },
  { id: 'i1', name: 'Reembolso', icon: 'cart' as const, group: INCOME_GROUP },
];

describe('CategoryChipsField with two groups', () => {
  it('shows the first group as chips, with "Outras…" even for few, and says what the group does', () => {
    render(<Harness list={grouped.slice(0, 2).concat(grouped.slice(7))} />);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Mercado',
      'Restaurantes',
      'Outras…',
    ]);
    expect(
      screen.getByText('Abate gasto: O crédito reduz o gasto da categoria e a fatura.'),
    ).toBeInTheDocument();
  });

  it('links the line to the field as its description', () => {
    render(<Harness list={grouped} />);

    expect(screen.getByRole('group', { name: 'Categoria' })).toHaveAccessibleDescription(
      'Abate gasto: O crédito reduz o gasto da categoria e a fatura.',
    );
  });

  it('keeps the five most used of the first group as chips, none of the second', () => {
    render(<Harness list={grouped} />);

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Mercado',
      'Restaurantes',
      'Transporte',
      'Saúde',
      'Lazer',
      'Outras…',
    ]);
    expect(screen.queryByRole('button', { name: 'Salário' })).not.toBeInTheDocument();
  });

  it('the search lists both groups, expense first, and filters inside them', async () => {
    const user = userEvent.setup();
    render(<Harness list={grouped} />);

    await user.click(screen.getByRole('button', { name: /Outras/ }));
    const search = screen.getByRole('combobox', { name: 'Buscar outra categoria' });
    await user.click(search);
    await user.keyboard('{ArrowDown}');
    await screen.findAllByRole('option');

    const sections = screen.getAllByRole('group', { name: /^(Abate gasto|Conta como receita)/ });
    expect(sections).toHaveLength(2);
    expect(within(sections[0]!).getByRole('option', { name: 'Mercado' })).toBeInTheDocument();
    expect(within(sections[1]!).getByRole('option', { name: 'Salário' })).toBeInTheDocument();
    expect(
      within(sections[1]!).getByText('O crédito vira receita do mês e também reduz a fatura.'),
    ).toBeInTheDocument();

    await user.type(search, 'Reemb');
    expect(await screen.findByRole('option', { name: 'Reembolso' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Mercado' })).not.toBeInTheDocument();
    // The group with no match goes away.
    expect(
      screen.getAllByRole('group', { name: /^(Abate gasto|Conta como receita)/ }),
    ).toHaveLength(1);
  });

  it('a category of the second group takes the last chip and the line follows its group', async () => {
    const user = userEvent.setup();
    render(<Harness list={grouped} />);

    await user.click(screen.getByRole('button', { name: /Outras/ }));
    await user.type(screen.getByRole('combobox', { name: 'Buscar outra categoria' }), 'Salár');
    await user.click(await screen.findByRole('option', { name: 'Salário' }));

    expect(screen.getByRole('button', { name: 'Salário' })).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByText(/Conta como receita: O crédito vira receita do mês/),
    ).toBeInTheDocument();
  });
});

function CreatingHarness({
  list = categories,
  kind = 'expense',
}: {
  list?: typeof categories | typeof grouped;
  kind?: Category.Kind | 'none';
}) {
  const [value, setValue] = useState<string | null>(null);
  return (
    <>
      <CategoryChipsField
        categories={list}
        value={value}
        onChange={setValue}
        newCategoryKind={kind === 'none' ? undefined : kind}
      />
      <output aria-label="chosen">{value ?? ''}</output>
    </>
  );
}

function renderCreating(props: Parameters<typeof CreatingHarness>[0] = {}) {
  const { wrapper } = createQueryWrapper();
  return render(<CreatingHarness {...props} />, { wrapper });
}

async function openSearch(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Outras/ }));
  const search = screen.getByRole('combobox', { name: 'Buscar outra categoria' });
  await user.click(search);
  return search;
}

describe('CategoryChipsField creating a category from the search', () => {
  it('offers nothing to create without the kind', async () => {
    const user = userEvent.setup();
    renderCreating({ kind: 'none' });

    await openSearch(user);
    await user.keyboard('{ArrowDown}');
    await screen.findAllByRole('option');

    expect(screen.queryByRole('option', { name: /categoria/i })).not.toBeInTheDocument();
  });

  it('ends the list with the fixed "Nova categoria" line, outside the categories', async () => {
    const user = userEvent.setup();
    renderCreating();

    await openSearch(user);
    await user.keyboard('{ArrowDown}');
    await screen.findAllByRole('option');

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(NAMES.length + 1);
    expect(options.at(-1)).toHaveAccessibleName('Nova categoria');
  });

  it('keeps "Nova categoria" when the search filters, and says "Criar categoria" for a name that matches none', async () => {
    const user = userEvent.setup();
    renderCreating();

    const search = await openSearch(user);
    await user.type(search, 'Merc');
    expect(await screen.findByRole('option', { name: 'Mercado' })).toBeInTheDocument();
    // A text that is only the start of a category is not that category yet.
    expect(screen.getByRole('option', { name: 'Criar categoria "Merc"' })).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'Barbearia');
    expect(
      await screen.findByRole('option', { name: 'Criar categoria "Barbearia"' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Mercado' })).not.toBeInTheDocument();
    // "Nenhuma categoria assim." lives together with the create line.
    expect(screen.getByText('Nenhuma categoria assim.')).toBeInTheDocument();
  });

  it('with a text that matches nothing, Enter creates without an arrow first', async () => {
    const user = userEvent.setup();
    renderCreating();

    const search = await openSearch(user);
    await user.type(search, 'Barbearia');
    await user.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });
    expect(within(dialog).getByRole('textbox', { name: 'Nome' })).toHaveValue('Barbearia');
  });

  it('with a text that matches a category, Enter picks the first match', async () => {
    const user = userEvent.setup();
    renderCreating();

    const again = await openSearch(user);
    await user.type(again, 'Merc');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByLabelText('chosen')).toHaveTextContent('c0'));
  });

  it('does not offer to create the name of a category that already exists', async () => {
    const user = userEvent.setup();
    renderCreating();

    const search = await openSearch(user);
    await user.type(search, 'mercado');

    expect(await screen.findByRole('option', { name: 'Mercado' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Nova categoria' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Criar categoria/ })).not.toBeInTheDocument();
  });

  it('creates from the typed name, with the type of the field fixed, and chooses the new category', async () => {
    const user = userEvent.setup();
    renderCreating({ kind: 'income' });

    const search = await openSearch(user);
    await user.type(search, 'Freela do Lucas');
    await user.click(
      await screen.findByRole('option', { name: 'Criar categoria "Freela do Lucas"' }),
    );

    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });
    expect(within(dialog).getByRole('textbox', { name: 'Nome' })).toHaveValue('Freela do Lucas');
    expect(within(dialog).queryByRole('radio', { name: 'Despesa' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Criar categoria' }));

    await waitFor(() =>
      expect(db.categories.some((category) => category.name === 'Freela do Lucas')).toBe(true),
    );
    const created = db.categories.find((category) => category.name === 'Freela do Lucas');
    expect(created?.kind).toBe('income');
    await waitFor(() =>
      expect(screen.getByLabelText('chosen')).toHaveTextContent(created?.id ?? 'missing'),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // The search closed after the choice.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('opens the modal empty from the fixed line, and leaves the choice as it was when it is closed', async () => {
    const user = userEvent.setup();
    renderCreating();

    await openSearch(user);
    await user.keyboard('{ArrowDown}');
    await user.click(await screen.findByRole('option', { name: 'Nova categoria' }));

    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });
    expect(within(dialog).getByRole('textbox', { name: 'Nome' })).toHaveValue('');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByLabelText('chosen')).toBeEmptyDOMElement();
  });

  it('reaches the line with the keyboard: ArrowUp from the field lands on it and Enter opens the modal', async () => {
    const user = userEvent.setup();
    renderCreating();

    await openSearch(user);
    await user.keyboard('{ArrowUp}{Enter}');

    expect(await screen.findByRole('dialog', { name: 'Nova categoria' })).toBeInTheDocument();
  });

  it('on a credit (two groups) the line is outside both, creates an expense and lets the type be changed', async () => {
    const user = userEvent.setup();
    renderCreating({ list: grouped });

    await openSearch(user);
    await user.keyboard('{ArrowDown}');
    await screen.findAllByRole('option');
    const sections = screen.getAllByRole('group', { name: /^(Abate gasto|Conta como receita)/ });
    const line = screen.getByRole('option', { name: 'Nova categoria' });
    expect(sections.some((section) => section.contains(line))).toBe(false);

    await user.click(line);
    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });

    expect(within(dialog).getByRole('radio', { name: 'Despesa' })).toBeChecked();
    expect(within(dialog).getByRole('radio', { name: 'Receita' })).toBeEnabled();
    expect(within(dialog).getByText(/a categoria de despesa abate o gasto/)).toBeInTheDocument();
  });
});
