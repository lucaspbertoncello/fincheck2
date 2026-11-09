import { TagPicker, type TagPickerOption } from '@fincheck/ui';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

const OPTIONS: TagPickerOption[] = [
  { id: 'a', name: 'Promoção' },
  { id: 'b', name: 'viagem' },
  { id: 'c', name: 'trabalho' },
];

function Harness({
  onCreate = (name: string) => Promise.resolve(`new-${name}`),
  options = OPTIONS,
  categoryName = 'Mercado',
  initial = [] as string[],
}: {
  onCreate?: (name: string) => Promise<string>;
  options?: TagPickerOption[];
  categoryName?: string | null;
  initial?: string[];
}) {
  const [ids, setIds] = useState(initial);
  const [created, setCreated] = useState<TagPickerOption[]>([]);
  const known = [...options, ...created];

  return (
    <TagPicker
      label="Tags"
      categoryName={categoryName}
      options={known}
      selected={known.filter((tag) => ids.includes(tag.id))}
      onChange={setIds}
      onCreate={async (name) => {
        const id = await onCreate(name);
        setCreated((current) => [...current, { id, name }]);
        return id;
      }}
    />
  );
}

const field = () => screen.getByRole('combobox', { name: /Buscar ou criar tag em Mercado/ });

describe('TagPicker (the tag chooser of a transaction)', () => {
  it('lists the tags of the category with no typing, and marks and unmarks with a click', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getAllByRole('option')).toHaveLength(3);
    await user.click(screen.getByRole('option', { name: /viagem/ }));
    expect(screen.getByRole('option', { name: /viagem/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: 'Remover a tag viagem' })).toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: /viagem/ }));
    expect(screen.getByRole('option', { name: /viagem/ })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('filters while typing, with no difference for case or accent', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(field(), 'PROMOCAO');

    expect(screen.getByRole('option', { name: /Promoção/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /viagem/ })).not.toBeInTheDocument();
    // The name exists (ignoring case and accent): nothing to create.
    expect(screen.queryByRole('option', { name: /Criar tag/ })).not.toBeInTheDocument();
  });

  it('offers "Criar tag" in the category when the text matches no name, and creates and marks it', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn((name: string) => Promise.resolve(`new-${name}`));
    render(<Harness onCreate={onCreate} />);

    await user.type(field(), 'feira');
    await user.click(screen.getByRole('option', { name: 'Criar tag "feira" em Mercado' }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('feira'));
    expect(await screen.findByRole('button', { name: 'Remover a tag feira' })).toBeInTheDocument();
    expect(field()).toHaveValue('');
  });

  it('works with the keyboard: arrows move, Enter marks, and Enter on the create line creates', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn((name: string) => Promise.resolve(`new-${name}`));
    render(<Harness onCreate={onCreate} />);

    await user.click(field());
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(screen.getByRole('option', { name: /viagem/ })).toHaveAttribute('aria-selected', 'true');
    expect(field()).toHaveAttribute('aria-activedescendant');

    await user.keyboard('{ArrowUp}{Enter}');
    expect(screen.getByRole('option', { name: /Promoção/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    await user.type(field(), 'nova');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('nova'));
  });

  it('Esc clears the text first', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(field(), 'via');
    await user.keyboard('{Escape}');

    expect(field()).toHaveValue('');
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('shows why a tag could not be created and keeps the text', async () => {
    const user = userEvent.setup();
    render(<Harness onCreate={() => Promise.reject(new Error('Já existe uma tag assim.'))} />);

    await user.type(field(), 'feira');
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('Já existe uma tag assim.');
    expect(field()).toHaveValue('feira');
  });

  it('asks for a category when there is none, and invites to the first tag when the category has none', () => {
    const { unmount } = render(<Harness categoryName={null} />);
    expect(screen.getByText(/Escolha a categoria da transação/)).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    unmount();

    render(<Harness options={[]} />);
    expect(screen.getByText(/Nenhuma tag em Mercado ainda/)).toBeInTheDocument();
  });
});
