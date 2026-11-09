import { render, screen, within } from '@testing-library/react';
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
