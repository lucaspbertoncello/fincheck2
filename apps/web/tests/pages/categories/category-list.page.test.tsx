import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '#mocks/setup/server.util.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function openCategories(url = '/categories', label = 'Categorias de despesa') {
  renderApp(url);
  return screen.findByRole('table', { name: label });
}

function typeInto(label: string, value: string, role: 'textbox' | 'searchbox' = 'textbox') {
  fireEvent.change(screen.getByRole(role, { name: label }), { target: { value } });
}

describe('CategoryListPage', () => {
  it('lists the active expense categories with the counts on the tabs and the tags below', async () => {
    const table = await openCategories();

    expect(within(table).getByText('Delivery')).toBeInTheDocument();
    expect(within(table).getByText('Mercado')).toBeInTheDocument();
    expect(within(table).queryByText('Viagem de 2025')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Despesas 12/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Receitas 5/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Arquivadas 1/ })).toBeInTheDocument();

    const tags = screen.getByRole('list', { name: 'Tags' });
    expect(within(tags).getByText('delivery')).toBeInTheDocument();
    expect(within(tags).queryByText('presente')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Arquivadas (1)' })).toBeInTheDocument();
  });

  it('shows the skeleton first and then the list', async () => {
    renderApp('/categories');

    expect(await screen.findByRole('status', { name: '' })).toBeInTheDocument();
    expect(await screen.findByRole('table', { name: 'Categorias de despesa' })).toBeInTheDocument();
  });

  it('switches to the income tab and keeps the choice in the URL', async () => {
    await openCategories();

    fireEvent.click(screen.getByRole('radio', { name: /Receitas/ }));

    const table = await screen.findByRole('table', { name: 'Categorias de receita' });
    expect(within(table).getByText('Salário')).toBeInTheDocument();
    expect(within(table).queryByText('Delivery')).not.toBeInTheDocument();
    expect(window.location.search).toBe('?filter=income');
  });

  it('narrows the list by the search text and says when nothing matches', async () => {
    const table = await openCategories();

    typeInto('Buscar categoria', 'merc', 'searchbox');
    await waitFor(() => expect(within(table).queryByText('Delivery')).not.toBeInTheDocument());
    expect(within(table).getByText('Mercado')).toBeInTheDocument();

    typeInto('Buscar categoria', 'zzz', 'searchbox');
    expect(await screen.findByText('Nenhuma categoria com esse nome.')).toBeInTheDocument();
  });

  it('shows the archived categories with the note and brings one back with an undo toast', async () => {
    await openCategories('/categories?filter=archived', 'Categorias arquivadas');

    const table = await screen.findByRole('table', { name: 'Categorias arquivadas' });
    expect(within(table).getByText('Viagem de 2025')).toBeInTheDocument();
    expect(within(table).getByText(/^Despesa · \d+ transações? · /)).toBeInTheDocument();
    expect(screen.getByText(/Arquivadas saem da escolha de categoria/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Desarquivar' }));

    expect(
      await screen.findByText('Viagem de 2025 voltou para a escolha de categoria.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Nenhuma categoria arquivada.')).toBeInTheDocument();

    fireEvent.click(await screen.findByText('Desfazer'));
    await waitFor(() =>
      expect(screen.getByRole('radio', { name: /Arquivadas 1/ })).toBeInTheDocument(),
    );
  });

  it('asks before archiving, with the impact, and offers to undo', async () => {
    const table = await openCategories();

    fireEvent.click(within(table).getByRole('button', { name: 'Ações de Delivery' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Arquivar' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Arquivar Delivery?')).toBeInTheDocument();
    expect(
      within(dialog).getByText(/continuam nela e seguem somando no histórico/),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/regra segue ligada, mas só soma tags/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Arquivar' }));

    expect(
      await screen.findByText('Delivery arquivada. Sai da escolha de categoria.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(within(table).queryByText('Delivery')).not.toBeInTheDocument());
    expect(screen.getByRole('radio', { name: /Despesas 11/ })).toBeInTheDocument();

    fireEvent.click(await screen.findByText('Desfazer'));
    await waitFor(() => expect(within(table).getByText('Delivery')).toBeInTheDocument());
  });

  it('keeps the category when the person cancels the archive dialog', async () => {
    const table = await openCategories();

    fireEvent.click(within(table).getByRole('button', { name: 'Ações de Pets' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Arquivar' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(within(table).getByText('Pets')).toBeInTheDocument();
  });

  it('opens "Nova categoria" from the URL, validates, focuses the first invalid field and saves', async () => {
    renderApp('/categories?new=category');

    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar categoria' }));

    expect(await within(dialog).findByText('Dê um nome à categoria.')).toBeInTheDocument();
    await waitFor(() =>
      expect(within(dialog).getByRole('textbox', { name: 'Nome' })).toHaveFocus(),
    );

    typeInto('Nome', 'Barbearia');
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Academia' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar categoria' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Barbearia')).toBeInTheDocument();
    expect(window.location.search).not.toContain('new=');
  });

  it('creates an income category when the Receitas tab is the one open', async () => {
    renderApp('/categories?filter=income&new=category');

    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });
    expect(within(dialog).getByRole('radio', { name: 'Receita' })).toBeChecked();
  });

  it('shows the name error next to the field when the name is already taken', async () => {
    renderApp('/categories?new=category');

    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });
    typeInto('Nome', 'Mercado');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar categoria' }));

    expect(
      await within(dialog).findByText('Já existe uma categoria com esse nome.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Nova categoria' })).toBeInTheDocument();
  });

  it('edits a category from the menu; the type cannot change', async () => {
    const table = await openCategories();

    fireEvent.click(within(table).getByRole('button', { name: 'Ações de Lazer' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Editar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar categoria' });
    expect(within(dialog).queryByRole('radio', { name: 'Despesa' })).not.toBeInTheDocument();
    typeInto('Nome', 'Diversão');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await within(table).findByText('Diversão')).toBeInTheDocument();
  });

  it('creates, renames and archives a tag, with undo for the archive', async () => {
    await openCategories();
    const tags = screen.getByRole('list', { name: 'Tags' });

    fireEvent.click(within(tags).getByRole('button', { name: 'Nova tag' }));
    let dialog = await screen.findByRole('dialog', { name: 'Nova tag' });
    typeInto('Nome da tag', 'mercado-mensal');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar tag' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await within(tags).findByText('mercado-mensal')).toBeInTheDocument();

    fireEvent.click(within(tags).getByRole('button', { name: 'Ações da tag mercado-mensal' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Renomear' }));
    dialog = await screen.findByRole('dialog', { name: 'Renomear tag' });
    typeInto('Nome da tag', 'feira');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await within(tags).findByText('feira')).toBeInTheDocument();

    fireEvent.click(within(tags).getByRole('button', { name: 'Ações da tag feira' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Arquivar' }));
    expect(
      await screen.findByText('Tag feira arquivada. Sai da escolha de tag.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(within(tags).queryByText('feira')).not.toBeInTheDocument());

    fireEvent.click(await screen.findByText('Desfazer'));
    expect(await within(tags).findByText('feira')).toBeInTheDocument();
  });

  it('shows the archived tags on demand', async () => {
    await openCategories();

    fireEvent.click(screen.getByRole('button', { name: 'Arquivadas (1)' }));

    const tags = screen.getByRole('list', { name: 'Tags' });
    expect(await within(tags).findByText('presente')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Esconder arquivadas' })).toBeInTheDocument();
  });

  it('shows the error with "Tentar de novo" when the categories do not load, and recovers', async () => {
    server.use(
      http.get('/api/categories', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'Falhou' }, { status: 500 }),
      ),
    );
    renderApp('/categories');

    expect(await screen.findByText('Não deu para carregar as categorias')).toBeInTheDocument();

    server.resetHandlers();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByRole('table', { name: 'Categorias de despesa' })).toBeInTheDocument();
  });

  it('puts Categorias in the header with the Regras sub-tab', async () => {
    await openCategories();

    expect(screen.getByRole('heading', { level: 1, name: 'Categorias' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Regras' })).toBeInTheDocument();
  });
});
