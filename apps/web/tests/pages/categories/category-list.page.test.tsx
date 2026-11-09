import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '#mocks/setup/server.util.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function openCategories(url = '/categories', label = 'Categorias de despesa') {
  renderApp(url);
  return screen.findByRole('list', { name: label });
}

async function openTags() {
  renderApp('/categories?filter=tags');
  return screen.findByRole('list', { name: 'Tags de Delivery' });
}

function typeInto(label: string, value: string, role: 'textbox' | 'searchbox' = 'textbox') {
  fireEvent.change(screen.getByRole(role, { name: label }), { target: { value } });
}

describe('CategoryListPage', () => {
  it('lists the active expense categories with the counts on the tabs, the Tags filter and no create row', async () => {
    const table = await openCategories();

    expect(within(table).getByText('Delivery')).toBeInTheDocument();
    expect(within(table).getByText('Mercado')).toBeInTheDocument();
    expect(within(table).queryByText('Viagem de 2025')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Despesas 24/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Receitas 7/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Arquivadas 1/ })).toBeInTheDocument();

    expect(screen.getByRole('radio', { name: /Tags 3/ })).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Tags de Delivery' })).not.toBeInTheDocument();
    // The only "Nova categoria" left is the "+" of the shell, not a row of the list.
    expect(within(table).queryByText('Nova categoria')).not.toBeInTheDocument();
  });

  it('shows the tags when the Tags filter is chosen, without the category search', async () => {
    await openCategories();

    fireEvent.click(screen.getByRole('radio', { name: /Tags 3/ }));

    // The tags come grouped by their category.
    const tags = await screen.findByRole('list', { name: 'Tags de Delivery' });
    expect(within(tags).getByText('delivery')).toBeInTheDocument();
    const travel = screen.getByRole('list', { name: 'Tags de Viagem' });
    expect(within(travel).getByText('viagem')).toBeInTheDocument();
    expect(screen.queryByText('presente')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Arquivadas (1)' })).toBeInTheDocument();
    expect(screen.queryByRole('searchbox', { name: 'Buscar categoria' })).not.toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Categorias de despesa' })).not.toBeInTheDocument();
    expect(window.location.search).toContain('filter=tags');
  });

  it('still offers "Nova tag" in every category when the API has no tag at all', async () => {
    server.use(http.get('/api/tags', () => HttpResponse.json({ items: [] })));
    renderApp('/categories?filter=tags');

    const market = await screen.findByRole('list', { name: 'Tags de Mercado' });
    expect(within(market).getByRole('button', { name: 'Nova tag' })).toBeInTheDocument();
  });

  it('shows the skeleton first and then the list', async () => {
    renderApp('/categories');

    expect(await screen.findByRole('status', { name: '' })).toBeInTheDocument();
    expect(await screen.findByRole('list', { name: 'Categorias de despesa' })).toBeInTheDocument();
  });

  it('switches to the income tab and keeps the choice in the URL', async () => {
    await openCategories();

    fireEvent.click(screen.getByRole('radio', { name: /Receitas/ }));

    const table = await screen.findByRole('list', { name: 'Categorias de receita' });
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

    const table = await screen.findByRole('list', { name: 'Categorias arquivadas' });
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
    expect(
      within(dialog).getByText(/regra segue ligada, mas a categoria deixa de ser posta/),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Arquivar' }));

    expect(
      await screen.findByText('Delivery arquivada. Sai da escolha de categoria.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(within(table).queryByText('Delivery')).not.toBeInTheDocument());
    expect(screen.getByRole('radio', { name: /Despesas 23/ })).toBeInTheDocument();

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

  it('shows the category as it will look in a transaction row and follows what is typed', async () => {
    const user = userEvent.setup();
    renderApp('/categories?new=category');
    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });

    expect(
      within(dialog).getByRole('img', { name: 'Prévia: categoria sem nome, Despesa' }),
    ).toBeInTheDocument();

    await user.type(within(dialog).getByRole('textbox', { name: 'Nome' }), 'Barbearia');
    await user.click(within(dialog).getByRole('radio', { name: 'Receita' }));

    expect(
      within(dialog).getByRole('img', { name: 'Prévia: Barbearia, Receita' }),
    ).toBeInTheDocument();
  });

  it('starts with the focus on the name and picks the icon from the grid with the keyboard', async () => {
    const user = userEvent.setup();
    renderApp('/categories?new=category');
    const dialog = await screen.findByRole('dialog', { name: 'Nova categoria' });

    await waitFor(() =>
      expect(within(dialog).getByRole('textbox', { name: 'Nome' })).toHaveFocus(),
    );
    expect(within(dialog).getAllByRole('radio', { name: /^(?!Despesa|Receita)/ }).length).toBe(32);

    await user.click(within(dialog).getByRole('radio', { name: 'Academia' }));
    expect(within(dialog).getByRole('radio', { name: 'Academia' })).toBeChecked();

    await user.type(within(dialog).getByRole('textbox', { name: 'Nome' }), 'Pilates');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Pilates')).toBeInTheDocument();
  });

  it('archives from the editor with the impact in the confirmation, then undoes it', async () => {
    const user = userEvent.setup();
    const table = await openCategories();

    await user.click(within(table).getByRole('button', { name: 'Ações de Delivery' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));
    const dialog = await screen.findByRole('dialog', { name: 'Editar categoria' });
    expect(within(dialog).getByText(/^Usada em /)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Arquivar' }));

    const confirm = await screen.findByRole('alertdialog').catch(() => screen.findByRole('dialog'));
    expect(within(confirm).getByText('Arquivar Delivery?')).toBeInTheDocument();
    expect(
      within(confirm).getByText(/continuam nela e seguem somando no histórico/),
    ).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Arquivar' }));

    expect(await screen.findByText(/Delivery arquivada/)).toBeInTheDocument();
    await user.click(await screen.findByText('Desfazer'));
    expect(await within(table).findByText('Delivery')).toBeInTheDocument();
  });

  it('brings an archived category back from its editor with "Desarquivar"', async () => {
    const user = userEvent.setup();
    const { json } = await callApi('GET', '/categories?status=archived');
    const archived = (json as { items: { id: string; name: string }[] }).items[0];
    renderApp(`/categories?filter=archived&edit=${archived?.id}`);

    const dialog = await screen.findByRole('dialog', { name: 'Editar categoria' });
    expect(within(dialog).queryByRole('button', { name: 'Arquivar' })).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Desarquivar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText(new RegExp(`${archived?.name} voltou`))).toBeInTheDocument();
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

  it('archives a tag from its rename modal, with the undo toast', async () => {
    const user = userEvent.setup();
    const tags = await openTags();

    await user.click(within(tags).getByRole('button', { name: 'Ações da tag delivery' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Renomear' }));
    const dialog = await screen.findByRole('dialog', { name: 'Renomear tag' });
    expect(within(dialog).getByRole('textbox', { name: 'Nome da tag' })).toHaveValue('delivery');
    await user.click(within(dialog).getByRole('button', { name: 'Arquivar' }));

    expect(
      await screen.findByText('Tag delivery arquivada. Sai da escolha de tag.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('creates, renames and archives a tag, with undo for the archive', async () => {
    renderApp('/categories?filter=tags');
    // A tag is only born inside a category: "Nova tag" is in the group of Mercado.
    const market = await screen.findByRole('list', { name: 'Tags de Mercado' });
    fireEvent.click(within(market).getByRole('button', { name: 'Nova tag' }));
    let dialog = await screen.findByRole('dialog', { name: 'Nova tag' });
    expect(within(dialog).getByText('Tag em Mercado')).toBeInTheDocument();
    typeInto('Nome da tag', 'mercado-mensal');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar tag' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const tags = await screen.findByRole('list', { name: 'Tags de Mercado' });
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
    await openTags();

    fireEvent.click(screen.getByRole('button', { name: 'Arquivadas (1)' }));

    const archived = await screen.findByRole('list', {
      name: 'Tags arquivadas de Presentes e doações',
    });
    expect(within(archived).getByText('presente')).toBeInTheDocument();
    const hide = screen.getByRole('button', { name: 'Esconder arquivadas' });
    expect(hide).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(hide);

    expect(
      screen.queryByRole('list', { name: 'Tags arquivadas de Presentes e doações' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Arquivadas (1)' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
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

    expect(await screen.findByRole('list', { name: 'Categorias de despesa' })).toBeInTheDocument();
  });

  it('puts Categorias in the header with the Regras sub-tab', async () => {
    await openCategories();

    expect(screen.getByRole('heading', { level: 1, name: 'Categorias' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Regras' })).toBeInTheDocument();
  });
});
