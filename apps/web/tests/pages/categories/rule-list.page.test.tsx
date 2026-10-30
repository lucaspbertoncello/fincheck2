import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '#mocks/setup/server.util.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

async function openRules(url = '/categories/rules') {
  renderApp(url);
  return screen.findByText('IFOOD', { selector: 'strong' });
}

function rowOf(text: string) {
  const row = screen.getByText(text, { selector: 'strong' }).closest('li');
  if (!row) throw new Error('rule row not found');
  return row;
}

async function enabledOf(description: string): Promise<boolean> {
  const { json } = await callApi('GET', '/rules');
  const items = (json as { items: { descriptionContains: string; enabled: boolean }[] }).items;
  return items.find((rule) => rule.descriptionContains === description)?.enabled ?? false;
}

describe('RuleListPage', () => {
  it('lists the rules as sentences with how many times each was applied, an off rule dimmed', async () => {
    await openRules();

    expect(rowOf('IFOOD')).toHaveTextContent(
      'Sempre que a descrição contém IFOOD, em despesas, vai para Delivery com a tag delivery.',
    );
    expect(rowOf('IFOOD')).toHaveTextContent('Aplicada 2 vezes');
    expect(rowOf('POSTO')).toHaveTextContent('vai para Transporte');
    expect(rowOf('POSTO')).toHaveTextContent('Aplicada 1 vez');
    expect(rowOf('FARMACIA')).toHaveTextContent('Desativada. Aplicada 0 vezes');
    expect(rowOf('FARMACIA')).toHaveTextContent('vai para Saúde');
    expect(screen.getByText('3 regras')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Categorias' })).toBeInTheDocument();
  });

  it('shows the skeleton while the rules load', async () => {
    renderApp('/categories/rules');

    expect(await screen.findByRole('status', { name: '' })).toBeInTheDocument();
    expect(await screen.findByText('IFOOD', { selector: 'strong' })).toBeInTheDocument();
  });

  it('shows the empty state when there are no rules, and its button opens the modal', async () => {
    server.use(http.get('/api/rules', () => HttpResponse.json({ items: [] })));
    renderApp('/categories/rules');

    expect(await screen.findByText('Nenhuma regra ainda')).toBeInTheDocument();
    const emptyState = screen.getByText('Nenhuma regra ainda').closest('div') as HTMLElement;
    fireEvent.click(within(emptyState).getByRole('button', { name: 'Criar regra' }));

    expect(await screen.findByRole('dialog', { name: 'Nova regra' })).toBeInTheDocument();
    expect(window.location.search).toBe('?new=rule');
  });

  it('shows the error with "Tentar de novo" and recovers', async () => {
    server.use(
      http.get('/api/rules', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'Falhou' }, { status: 500 }),
      ),
    );
    renderApp('/categories/rules');

    expect(await screen.findByText('Não deu para carregar as regras')).toBeInTheDocument();

    server.resetHandlers();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('IFOOD', { selector: 'strong' })).toBeInTheDocument();
  });

  it('turns a rule off and on with the switch and saves it', async () => {
    await openRules();

    fireEvent.click(within(rowOf('IFOOD')).getByRole('switch'));

    await waitFor(() => expect(enabledOf('IFOOD')).resolves.toBe(false));
    expect(rowOf('IFOOD')).toHaveTextContent('Desativada.');

    fireEvent.click(within(rowOf('IFOOD')).getByRole('switch'));
    await waitFor(() => expect(enabledOf('IFOOD')).resolves.toBe(true));
  });

  it('shows the switch error when the update fails and puts the switch back', async () => {
    await openRules();
    server.use(
      http.patch('/api/rules/:id', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'Falhou' }, { status: 500 }),
      ),
    );

    fireEvent.click(within(rowOf('IFOOD')).getByRole('switch'));

    expect(
      await screen.findByText('Não deu para ligar ou desligar a regra. Tente de novo.'),
    ).toBeInTheDocument();
    await waitFor(() => expect(within(rowOf('IFOOD')).getByRole('switch')).toBeChecked());
  });

  it('hides a deleted rule at once and brings it back with "Desfazer" before the delete goes out', async () => {
    await openRules();

    fireEvent.click(within(rowOf('POSTO')).getByRole('button', { name: 'Ações da regra' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Excluir' }));

    await waitFor(() =>
      expect(screen.queryByText('POSTO', { selector: 'strong' })).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('Regra excluída.')).toBeInTheDocument();

    fireEvent.click(await screen.findByText('Desfazer'));

    expect(await screen.findByText('POSTO', { selector: 'strong' })).toBeInTheDocument();
    const { json } = await callApi('GET', '/rules');
    expect((json as { items: unknown[] }).items).toHaveLength(3);
  });

  it('opens the transactions of a rule from "Aplicada N vezes"', async () => {
    await openRules();

    fireEvent.click(within(rowOf('IFOOD')).getByRole('link', { name: 'Aplicada 2 vezes' }));

    await waitFor(() => expect(window.location.pathname).toBe('/transactions'));
    expect(window.location.search).toContain('ruleId=');
  });

  describe('suggestion card', () => {
    it('shows the strongest suggestion with its sentence and how many more are waiting', async () => {
      await openRules();

      expect(await screen.findByText('Sugerida')).toBeInTheDocument();
      expect(screen.getByText(/Você moveu 10 transações “NOTEBOOK AERO 14”/)).toBeInTheDocument();
      expect(screen.getByText('Mais 6 sugestões esperam a sua resposta.')).toBeInTheDocument();
    });

    it('dismisses it with "Agora não" and the next one comes up', async () => {
      await openRules();
      await screen.findByText('Sugerida');

      fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));

      expect(await screen.findByText(/“UBER \*TRIP”/)).toBeInTheDocument();
      expect(screen.queryByText(/NOTEBOOK AERO 14”/)).not.toBeInTheDocument();
    });

    it('creates the rule, asks before applying to the history, and undoes the history change', async () => {
      await openRules();
      await screen.findByText('Sugerida');
      fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
      await screen.findByText(/“UBER \*TRIP”/);

      expect(screen.getByText('Bate com 7 transações do histórico')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('checkbox', { name: 'Aplicar também nessa transação' }));
      fireEvent.click(screen.getByRole('button', { name: 'Criar regra' }));

      const dialog = await screen.findByRole('dialog', {
        name: 'Aplicar a regra no histórico?',
      });
      expect(within(dialog).getByText(/1 transação vai para Transporte/)).toBeInTheDocument();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Recategorizar 1' }));

      expect(await screen.findByText('1 transação foi para Transporte.')).toBeInTheDocument();
      expect(await screen.findByText('UBER *TRIP', { selector: 'strong' })).toBeInTheDocument();

      fireEvent.click(await screen.findByText('Desfazer'));
      await waitFor(async () => {
        const { json } = await callApi('GET', '/transactions?search=UBER');
        const items = (json as { items: { categoryId: string | null }[] }).items;
        expect(items.some((item) => item.categoryId === null)).toBe(true);
      });
    });

    it('creates the rule without the history option, with an undo that deletes the rule', async () => {
      await openRules();
      await screen.findByText('Sugerida');

      fireEvent.click(screen.getByRole('button', { name: 'Criar regra' }));

      expect(
        await screen.findByText('Regra criada. Vale para as próximas transações.'),
      ).toBeInTheDocument();
      expect(
        await screen.findByText('NOTEBOOK AERO 14', { selector: 'strong' }),
      ).toBeInTheDocument();

      fireEvent.click(await screen.findByText('Desfazer'));
      await waitFor(() =>
        expect(
          screen.queryByText('NOTEBOOK AERO 14', { selector: 'strong' }),
        ).not.toBeInTheDocument(),
      );
    });
  });

  describe('rule modal', () => {
    it('validates before sending: text and action, with the focus on the first problem', async () => {
      const user = userEvent.setup();
      renderApp('/categories/rules?new=rule');
      const dialog = await screen.findByRole('dialog', { name: 'Nova regra' });

      await user.click(within(dialog).getByRole('button', { name: 'Criar regra' }));

      expect(
        await within(dialog).findByText('Escreva um trecho da descrição, com pelo menos 2 letras.'),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText('Escolha uma categoria ou ao menos uma tag.'),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(within(dialog).getByRole('textbox', { name: 'Trecho da descrição' })).toHaveFocus(),
      );
    });

    it('starts with the focus on the sentence text and says what to type', async () => {
      renderApp('/categories/rules?new=rule');
      const dialog = await screen.findByRole('dialog', { name: 'Nova regra' });

      await waitFor(() =>
        expect(within(dialog).getByRole('textbox', { name: 'Trecho da descrição' })).toHaveFocus(),
      );
      expect(
        within(dialog).getByText(
          'Escreva um trecho da descrição para ver o que a regra pega no histórico.',
        ),
      ).toBeInTheDocument();
    });

    it('builds the sentence in place, previews the history and creates the rule', async () => {
      const user = userEvent.setup();
      renderApp('/categories/rules?new=rule');
      const dialog = await screen.findByRole('dialog', { name: 'Nova regra' });

      await user.type(
        within(dialog).getByRole('textbox', { name: 'Trecho da descrição' }),
        'ifood',
      );
      await user.click(within(dialog).getByRole('button', { name: 'Categoria da regra' }));
      await user.click(await screen.findByRole('button', { name: 'Delivery' }));

      expect(
        await within(dialog).findByText(/Bate com \d+ transações do histórico/, undefined, {
          timeout: 3000,
        }),
      ).toBeInTheDocument();
      expect(within(dialog).getByRole('textbox', { name: 'Trecho da descrição' })).toHaveValue(
        'ifood',
      );

      await user.click(within(dialog).getByRole('button', { name: 'Criar regra' }));

      expect(
        await screen.findByText('Regra criada. Vale para as próximas transações.'),
      ).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(window.location.search).not.toContain('new=');
      expect(await screen.findAllByText('IFOOD', { selector: 'strong' })).toHaveLength(2);
    });

    it('creates the rule on Enter from the text, without opening any picker', async () => {
      const user = userEvent.setup();
      renderApp('/categories/rules?new=rule');
      const dialog = await screen.findByRole('dialog', { name: 'Nova regra' });

      await user.type(within(dialog).getByRole('textbox', { name: 'Trecho da descrição' }), 'x');
      await user.keyboard('{Enter}');

      expect(
        await within(dialog).findByText('Escolha uma categoria ou ao menos uma tag.'),
      ).toBeInTheDocument();
    });

    it('limits the rule to one account from the sentence and sends it', async () => {
      const user = userEvent.setup();
      renderApp('/categories/rules?new=rule');
      const dialog = await screen.findByRole('dialog', { name: 'Nova regra' });

      expect(within(dialog).getByRole('button', { name: 'Conta da regra' })).toHaveTextContent(
        'qualquer conta',
      );
      await user.type(
        within(dialog).getByRole('textbox', { name: 'Trecho da descrição' }),
        'ifood',
      );
      await user.click(within(dialog).getByRole('button', { name: 'Conta da regra' }));
      const accounts = await screen.findByRole('group', { name: 'Contas' });
      const [firstAccount] = within(accounts)
        .getAllByRole('button')
        .filter((button) => button.textContent !== 'Qualquer conta');
      const accountName = firstAccount?.textContent ?? '';
      await user.click(firstAccount as HTMLElement);
      expect(within(dialog).getByRole('button', { name: 'Conta da regra' })).toHaveTextContent(
        accountName,
      );

      await user.click(within(dialog).getByRole('button', { name: 'Categoria da regra' }));
      await user.click(await screen.findByRole('button', { name: 'Delivery' }));
      await user.click(within(dialog).getByRole('button', { name: 'Criar regra' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      const { json } = await callApi('GET', '/rules');
      const created = (
        json as { items: { descriptionContains: string; accountId: string | null }[] }
      ).items.find((rule) => rule.descriptionContains === 'IFOOD' && rule.accountId !== null);
      expect(created).toBeDefined();
    });

    it('shows the server message when the rule already exists', async () => {
      const user = userEvent.setup();
      server.use(
        http.post('/api/rules', () =>
          HttpResponse.json({ code: 'RULE_DUPLICATE', message: 'dup' }, { status: 409 }),
        ),
      );
      renderApp('/categories/rules?new=rule');
      const dialog = await screen.findByRole('dialog', { name: 'Nova regra' });

      await user.type(
        within(dialog).getByRole('textbox', { name: 'Trecho da descrição' }),
        'padaria',
      );
      await user.click(within(dialog).getByRole('button', { name: 'Categoria da regra' }));
      await user.click(await screen.findByRole('button', { name: 'Restaurantes' }));
      await user.click(within(dialog).getByRole('button', { name: 'Criar regra' }));

      expect(
        await within(dialog).findByText('Já existe uma regra com essa condição.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Nova regra' })).toBeInTheDocument();
    });

    it('edits a rule from the menu, starting from what it has, and sends only what changed', async () => {
      const user = userEvent.setup();
      await openRules();

      await user.click(within(rowOf('POSTO')).getByRole('button', { name: 'Ações da regra' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));

      const dialog = await screen.findByRole('dialog', { name: 'Editar regra' });
      expect(within(dialog).getByRole('textbox', { name: 'Trecho da descrição' })).toHaveValue(
        'POSTO',
      );
      expect(within(dialog).getByRole('button', { name: 'Categoria da regra' })).toHaveTextContent(
        'Transporte',
      );

      await user.click(within(dialog).getByRole('button', { name: 'Tags da regra' }));
      await user.click(await screen.findByRole('button', { name: 'trabalho' }));
      await user.click(screen.getByRole('button', { name: 'Pronto' }));
      await user.click(within(dialog).getByRole('button', { name: 'Salvar regra' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await waitFor(() =>
        expect(rowOf('POSTO')).toHaveTextContent('vai para Transporte com a tag trabalho'),
      );
    });

    it('deletes from the editor with "Excluir" and brings the rule back with "Desfazer"', async () => {
      const user = userEvent.setup();
      await openRules();

      await user.click(within(rowOf('POSTO')).getByRole('button', { name: 'Ações da regra' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));
      const dialog = await screen.findByRole('dialog', { name: 'Editar regra' });
      await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(screen.queryByText('POSTO', { selector: 'strong' })).not.toBeInTheDocument();
      expect(await screen.findByText('Regra excluída.')).toBeInTheDocument();

      await user.click(await screen.findByText('Desfazer'));

      expect(await screen.findByText('POSTO', { selector: 'strong' })).toBeInTheDocument();
      const { json } = await callApi('GET', '/rules');
      expect((json as { items: unknown[] }).items).toHaveLength(3);
    });

    it('offers no "Excluir" while creating', async () => {
      renderApp('/categories/rules?new=rule');
      const dialog = await screen.findByRole('dialog', { name: 'Nova regra' });

      expect(within(dialog).queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
    });

    it('opens the editor of a rule straight from the URL', async () => {
      const { json } = await callApi('GET', '/rules');
      const posto = (json as { items: { id: string; descriptionContains: string }[] }).items.find(
        (rule) => rule.descriptionContains === 'POSTO',
      );
      renderApp(`/categories/rules?edit=${posto?.id}`);

      expect(await screen.findByRole('dialog', { name: 'Editar regra' })).toBeInTheDocument();
    });
  });
});
