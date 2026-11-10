import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { createQueryWrapper } from '#tests/support/api/create-query-wrapper.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';
import { CategoryForm } from '#/shared/components/categories/category-form/category-form.component.tsx';
import type { CategoryFormTarget } from '#/shared/types/categories/category-form.type.ts';

vi.setConfig({ testTimeout: 30_000 });
resetDatabaseBeforeEach();

function open(target: CategoryFormTarget) {
  const onClose = vi.fn();
  const onCreated = vi.fn<(category: Category.Dto) => void>();
  const { wrapper } = createQueryWrapper();
  render(<CategoryForm target={target} onClose={onClose} onCreated={onCreated} />, { wrapper });

  return { onClose, onCreated };
}

describe('CategoryForm opened from a picker', () => {
  it('opens with the typed name and the type of the field, and no choice of type', async () => {
    open({ mode: 'create', kind: 'expense', name: 'Pets', lockKind: true });

    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });

    expect(within(dialog).getByRole('textbox', { name: 'Nome' })).toHaveValue('Pets');
    expect(within(dialog).queryByRole('radio', { name: 'Receita' })).not.toBeInTheDocument();
  });

  it('keeps the type free, with the subtitle that says what each does, when both kinds fit', async () => {
    open({
      mode: 'create',
      kind: 'expense',
      name: '',
      subtitle: 'Despesa abate o gasto.',
      lockKind: false,
    });

    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });

    expect(within(dialog).getByText('Despesa abate o gasto.')).toBeInTheDocument();
    expect(within(dialog).getByRole('radio', { name: 'Despesa' })).toBeChecked();
    expect(within(dialog).getByRole('radio', { name: 'Receita' })).not.toBeChecked();
  });

  it('cuts a typed name to the 40 characters the field takes', async () => {
    open({ mode: 'create', kind: 'expense', name: 'x'.repeat(60), lockKind: true });

    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });

    expect(within(dialog).getByRole('textbox', { name: 'Nome' })).toHaveValue('x'.repeat(40));
  });

  it('creates the category and gives it back before it closes', async () => {
    const user = userEvent.setup();
    const { onCreated, onClose } = open({
      mode: 'create',
      kind: 'income',
      name: 'Freela do Gabriel',
      lockKind: true,
    });

    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });
    await user.click(within(dialog).getByRole('button', { name: 'Criar categoria' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(onCreated.mock.calls[0]?.[0]).toMatchObject({
      name: 'Freela do Gabriel',
      kind: 'income',
    });
    expect(onClose).toHaveBeenCalled();
    expect(db.categories.some((category) => category.name === 'Freela do Gabriel')).toBe(true);
  });

  it('says the name is taken (and may be archived: the picker lists only the active ones), keeps the modal open and gives nothing back', async () => {
    const user = userEvent.setup();
    const taken = db.categories.find(
      (category) => category.kind === 'expense' && !category.isTransfer,
    );
    if (!taken) throw new Error('seed without an expense category');
    const { onCreated, onClose } = open({
      mode: 'create',
      kind: 'expense',
      name: taken.name,
      lockKind: true,
    });

    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });
    await user.click(within(dialog).getByRole('button', { name: 'Criar categoria' }));

    expect(
      await within(dialog).findByText(
        'Já existe uma categoria com esse nome (pode estar arquivada).',
      ),
    ).toBeVisible();
    expect(onCreated).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('asks for a name when none was typed', async () => {
    const user = userEvent.setup();
    const { onCreated } = open({ mode: 'create', kind: 'expense', name: '', lockKind: true });

    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });
    await user.click(within(dialog).getByRole('button', { name: 'Criar categoria' }));

    expect(await within(dialog).findByText('Dê um nome à categoria.')).toBeVisible();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('renders nothing while there is no target', () => {
    const { wrapper } = createQueryWrapper();
    render(<CategoryForm target={null} onClose={vi.fn()} />, { wrapper });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('CategoryForm opened from the Categorias screen', () => {
  it('says only that the name is taken: that list shows the archived ones too', async () => {
    const user = userEvent.setup();
    const taken = db.categories.find(
      (category) => category.kind === 'expense' && !category.isTransfer,
    );
    if (!taken) throw new Error('seed without an expense category');
    open({ mode: 'create', kind: 'expense' });

    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Nome' }), taken.name);
    await user.click(within(dialog).getByRole('button', { name: 'Criar categoria' }));

    expect(await within(dialog).findByText('Já existe uma categoria com esse nome.')).toBeVisible();
  });
});
