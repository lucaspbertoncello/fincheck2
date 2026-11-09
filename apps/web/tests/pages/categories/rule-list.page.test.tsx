import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
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
    expect(rowOf('POSTO')).toHaveTextContent('vai para Combustível');
    expect(rowOf('POSTO')).toHaveTextContent('Aplicada 1 vez');
    expect(rowOf('FARMACIA')).toHaveTextContent(/Desativada.*Aplicada 0 vezes/);
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
    expect(rowOf('IFOOD')).toHaveTextContent('Desativada');

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

    fireEvent.click(within(rowOf('IFOOD')).getByRole('button', { name: 'Aplicada 2 vezes' }));

    await waitFor(() => expect(window.location.pathname).toBe('/transactions'));
    expect(window.location.search).toContain('ruleId=');
  });

  describe('suggestion card', () => {
    // The API groups by the description without the "n/N" and only a rule with a text condition
    // covers a suggestion, so the seed has more than the two the flows below are about: answer the
    // others first.
    async function keepOnlyNotebookAndUber() {
      const { json } = await callApi('GET', '/rule-suggestions');
      const items = (json as { items: { pattern: string; categoryId: string }[] }).items;
      for (const item of items) {
        if (item.pattern === 'NOTEBOOK AERO 14' || item.pattern === 'UBER *TRIP') continue;
        await callApi('POST', '/rule-suggestions/dismiss', {
          pattern: item.pattern,
          categoryId: item.categoryId,
        });
      }
    }

    it('shows the strongest suggestion with its sentence and how many more are waiting', async () => {
      await openRules();

      expect(await screen.findByText('Sugerida')).toBeInTheDocument();
      expect(
        screen.getByText(/10 transações com a descrição “CONDOMINIO RES ALVORADA REF” estão em/),
      ).toBeInTheDocument();
      expect(screen.getByText('Mais 14 sugestões esperam a sua resposta.')).toBeInTheDocument();
    });

    it('groups the installments of one purchase as one suggestion, without the "n/N"', async () => {
      const { json } = await callApi('GET', '/rule-suggestions');
      const patterns = (json as { items: { pattern: string }[] }).items.map((item) => item.pattern);

      expect(patterns).toContain('NOTEBOOK AERO 14');
      expect(patterns.some((pattern) => /\d+\/\d+/.test(pattern))).toBe(false);
    });

    it('dismisses it with "Agora não" and the next one comes up', async () => {
      await keepOnlyNotebookAndUber();
      await openRules();
      await screen.findByText('Sugerida');

      fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));

      expect(await screen.findByText(/“UBER \*TRIP”/)).toBeInTheDocument();
      expect(screen.queryByText(/NOTEBOOK AERO 14”/)).not.toBeInTheDocument();
    });

    it('creates the rule, asks before applying to the history, and undoes the history change', async () => {
      await keepOnlyNotebookAndUber();
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
      fireEvent.click(within(dialog).getByRole('button', { name: 'Aplicar em 1' }));

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
      await keepOnlyNotebookAndUber();
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

  describe('apply to the existing transactions', () => {
    async function createSalaryRule() {
      const categories = (await callApi('GET', '/categories?kind=income')).json as {
        items: { id: string; name: string }[];
      };
      const salary = categories.items.find((item) => item.name === 'Salário');
      await callApi('POST', '/rules', {
        counterpartyContains: 'treetools',
        categoryId: salary?.id,
      });

      return salary?.id;
    }

    async function categoriesOfTreetools(): Promise<(string | null)[]> {
      const { json } = await callApi('GET', '/transactions?search=treetools');
      return (json as { items: { description: string; categoryId: string | null }[] }).items
        .filter((item) => item.description === 'PIX RECEBIDO TREETOOLS')
        .map((item) => item.categoryId);
    }

    async function openApply(strongText: string) {
      renderApp('/categories/rules');
      await screen.findByText(strongText, { selector: 'strong' });
      fireEvent.click(within(rowOf(strongText)).getByRole('button', { name: 'Ações da regra' }));
      fireEvent.click(
        await screen.findByRole('menuitem', { name: 'Aplicar nas transações existentes' }),
      );
    }

    it('shows what would change with examples, applies on confirm and undoes from the toast', async () => {
      const salaryId = await createSalaryRule();
      expect((await categoriesOfTreetools()).filter((id) => id === salaryId)).toHaveLength(0);

      await openApply('Treetools');

      const dialog = await screen.findByRole('dialog', {
        name: 'Aplicar a regra nas transações existentes?',
      });
      expect(within(dialog).getByText(/Muda 3 transações/)).toBeInTheDocument();
      expect(within(dialog).getAllByText(/PIX RECEBIDO TREETOOLS: .* → Salário/)).toHaveLength(3);
      expect(within(dialog).getByText('Edições feitas à mão não mudam.')).toBeInTheDocument();

      fireEvent.click(within(dialog).getByRole('button', { name: 'Aplicar em 3' }));

      expect(await screen.findByText('3 transações foram para Salário.')).toBeInTheDocument();
      expect((await categoriesOfTreetools()).filter((id) => id === salaryId)).toHaveLength(3);

      fireEvent.click(await screen.findByText('Desfazer'));
      await waitFor(async () =>
        expect((await categoriesOfTreetools()).filter((id) => id === salaryId)).toHaveLength(0),
      );
    });

    it('says why nothing changes and offers no confirmation when everything is already right', async () => {
      await createSalaryRule();
      await openApply('Treetools');
      fireEvent.click(await screen.findByRole('button', { name: 'Aplicar em 3' }));
      await screen.findByText('3 transações foram para Salário.');

      fireEvent.click(within(rowOf('Treetools')).getByRole('button', { name: 'Ações da regra' }));
      fireEvent.click(
        await screen.findByRole('menuitem', { name: 'Aplicar nas transações existentes' }),
      );

      expect(
        await screen.findByText(
          /já estão certas, ou foram categorizadas à mão, por recorrência ou pela conta/,
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Aplicar em/ })).not.toBeInTheDocument();
    });

    it('says when no transaction matches and when the rule is off', async () => {
      await callApi('POST', '/rules', { descriptionContains: 'zzzz nada', tagIds: [] });
      await openApply('FARMACIA');

      expect(
        await screen.findByText(
          'A regra está desligada. Ligue-a para aplicar nas transações existentes.',
        ),
      ).toBeInTheDocument();
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
        within(dialog).getByText('Escolha a categoria da regra. As tags dela se escolhem depois.'),
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
        within(dialog).getByText('Preencha a condição para ver o que a regra pega no histórico.'),
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
        await within(dialog).findByText(
          'Escolha a categoria da regra. As tags dela se escolhem depois.',
        ),
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

    it('chooses the sender condition, previews it and creates a Pix rule with its sentence', async () => {
      const user = userEvent.setup();
      renderApp('/categories/rules?new=rule');
      const dialog = await screen.findByRole('dialog', { name: 'Nova regra' });

      await user.click(within(dialog).getByRole('radio', { name: 'Quem mandou ou recebeu' }));

      expect(
        within(dialog).queryByRole('textbox', { name: 'Trecho da descrição' }),
      ).not.toBeInTheDocument();
      await user.type(
        within(dialog).getByRole('textbox', { name: 'Quem mandou ou recebeu' }),
        'jose',
      );
      await user.click(within(dialog).getByRole('button', { name: 'Categoria da regra' }));
      await user.click(await screen.findByRole('button', { name: 'Delivery' }));

      expect(
        await within(dialog).findByText(/Bate com \d+ transaç(ão|ões) do histórico/, undefined, {
          timeout: 3000,
        }),
      ).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: 'Criar regra' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      const { json } = await callApi('GET', '/rules');
      expect(
        (
          json as {
            items: { descriptionContains: string | null; counterpartyContains: string | null }[];
          }
        ).items,
      ).toContainEqual(
        expect.objectContaining({ descriptionContains: null, counterpartyContains: 'JOSE' }),
      );
      expect(await screen.findByText('Jose', { selector: 'strong' })).toHaveTextContent('Jose');
      expect(screen.getByText('Jose', { selector: 'strong' }).closest('li')).toHaveTextContent(
        'Sempre que o Pix for de Jose, vai para Delivery.',
      );
    });

    it('offers the text conditions as whole-label chips for narrow screens and switches with them', async () => {
      const user = userEvent.setup();
      renderApp('/categories/rules?new=rule');
      const dialog = await screen.findByRole('dialog', { name: 'Nova regra' });
      const chips = within(dialog).getAllByRole('group', { name: 'Condição de texto da regra' })[0];

      for (const label of ['Descrição', 'Quem mandou ou recebeu', 'Os dois'])
        expect(
          within(chips as HTMLElement).getByRole('button', { name: label }),
        ).toBeInTheDocument();

      await user.click(within(chips as HTMLElement).getByRole('button', { name: 'Os dois' }));

      expect(
        within(dialog).getByRole('textbox', { name: 'Quem mandou ou recebeu' }),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByRole('textbox', { name: 'Trecho da descrição' }),
      ).toBeInTheDocument();
    });

    it('with both conditions asks for both texts and sends both', async () => {
      const user = userEvent.setup();
      renderApp('/categories/rules?new=rule');
      const dialog = await screen.findByRole('dialog', { name: 'Nova regra' });

      await user.click(within(dialog).getByRole('radio', { name: 'Os dois' }));
      await user.type(within(dialog).getByRole('textbox', { name: 'Trecho da descrição' }), 'pix');
      await user.type(within(dialog).getByRole('textbox', { name: 'Quem mandou ou recebeu' }), 'j');
      await user.click(within(dialog).getByRole('button', { name: 'Criar regra' }));

      expect(
        await within(dialog).findByText(
          'Escreva o nome de quem mandou ou recebeu, com pelo menos 2 letras.',
        ),
      ).toBeInTheDocument();
      await waitFor(() =>
        expect(
          within(dialog).getByRole('textbox', { name: 'Quem mandou ou recebeu' }),
        ).toHaveFocus(),
      );

      await user.type(
        within(dialog).getByRole('textbox', { name: 'Quem mandou ou recebeu' }),
        'ose',
      );
      await user.click(within(dialog).getByRole('button', { name: 'Categoria da regra' }));
      await user.click(await screen.findByRole('button', { name: 'Delivery' }));
      await user.click(within(dialog).getByRole('button', { name: 'Criar regra' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      const { json } = await callApi('GET', '/rules');
      expect((json as { items: unknown[] }).items).toContainEqual(
        expect.objectContaining({ descriptionContains: 'PIX', counterpartyContains: 'JOSE' }),
      );
      expect(screen.getByText('PIX', { selector: 'strong' }).closest('li')).toHaveTextContent(
        'Sempre que a descrição contém PIX e o Pix for de Jose, vai para Delivery.',
      );
    });

    it('opens "Criar regra" from a Pix with the sender already filled in', async () => {
      const { json } = await callApi('GET', '/transactions?limit=100');
      const pix = (
        json as { items: { id: string; bank: { counterparty: string | null } | null }[] }
      ).items.find((item) => item.bank?.counterparty);
      expect(pix).toBeDefined();

      renderApp(`/categories/rules?new=rule&from=${pix?.id}`);
      const dialog = await screen.findByRole('dialog', { name: 'Nova regra' });

      expect(within(dialog).getByRole('radio', { name: 'Quem mandou ou recebeu' })).toBeChecked();
      expect(within(dialog).getByRole('textbox', { name: 'Quem mandou ou recebeu' })).toHaveValue(
        pix?.bank?.counterparty,
      );
    });

    it('edits a rule that has both conditions and clears the sender when it goes back to the description', async () => {
      const user = userEvent.setup();
      const ifood = (
        (await callApi('GET', '/rules')).json as {
          items: { id: string; descriptionContains: string }[];
        }
      ).items.find((rule) => rule.descriptionContains === 'IFOOD');
      await callApi('PATCH', `/rules/${ifood?.id}`, { counterpartyContains: 'loja' });

      renderApp(`/categories/rules?edit=${ifood?.id}`);
      const dialog = await screen.findByRole('dialog', { name: 'Editar regra' });

      expect(within(dialog).getByRole('radio', { name: 'Os dois' })).toBeChecked();
      expect(within(dialog).getByRole('textbox', { name: 'Quem mandou ou recebeu' })).toHaveValue(
        'LOJA',
      );

      await user.click(within(dialog).getByRole('radio', { name: 'Descrição' }));
      await user.click(within(dialog).getByRole('button', { name: 'Salvar regra' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      const { json } = await callApi('GET', '/rules');
      expect(
        (json as { items: { id: string; counterpartyContains: string | null }[] }).items.find(
          (rule) => rule.id === ifood?.id,
        )?.counterpartyContains,
      ).toBeNull();
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
      // The tags of a rule are the ones of its category (Combustível).
      db.tags.push({
        id: '019a5a00-0000-7000-8000-0000000000bb',
        categoryId: db.categories.find((category) => category.name === 'Combustível')!.id,
        name: 'trabalho',
        archivedAt: null,
      });
      await openRules();

      await user.click(within(rowOf('POSTO')).getByRole('button', { name: 'Ações da regra' }));
      await user.click(await screen.findByRole('menuitem', { name: 'Editar' }));

      const dialog = await screen.findByRole('dialog', { name: 'Editar regra' });
      expect(within(dialog).getByRole('textbox', { name: 'Trecho da descrição' })).toHaveValue(
        'POSTO',
      );
      expect(within(dialog).getByRole('button', { name: 'Categoria da regra' })).toHaveTextContent(
        'Combustível',
      );

      await user.click(within(dialog).getByRole('button', { name: 'Tags da regra' }));
      await user.click(await screen.findByRole('button', { name: 'trabalho' }));
      await user.click(screen.getByRole('button', { name: 'Pronto' }));
      await user.click(within(dialog).getByRole('button', { name: 'Salvar regra' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await waitFor(() =>
        expect(rowOf('POSTO')).toHaveTextContent('vai para Combustível com a tag trabalho'),
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
