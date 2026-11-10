import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '#mocks/setup/server.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { renderApp } from '#tests/support/app/render-app.util.tsx';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

const LONG_WAIT = { timeout: 5000 };

function cardId(name: string): string {
  const card = db.accounts.find((item) => item.name === name);
  if (!card) throw new Error(`The seed has no ${name} card`);

  return card.id;
}

async function openPlans(name: string, search = '') {
  renderApp(`/cards/${cardId(name)}/installments${search}`);
  await screen.findByRole(
    'heading',
    { level: 1, name: `Compras parceladas do ${name}` },
    LONG_WAIT,
  );
}

async function openRowMenu(plan: string, item: string) {
  fireEvent.click(await screen.findByRole('button', { name: `Ações de ${plan}` }, LONG_WAIT));
  fireEvent.click(await screen.findByRole('menuitem', { name: item }));
}

describe('InstallmentPlanListPage', () => {
  it('lists the plans of the card: current installment, total and what is left', async () => {
    await openPlans('Bradesco Black');

    const row = (await screen.findByText('Tênis de corrida', undefined, LONG_WAIT)).closest('li');
    expect(row).toHaveTextContent(/Parcela \d de 4 · primeira fatura/);
    expect(row).toHaveTextContent(/599,60/);
    expect(row).toHaveTextContent(/faltam/);
    expect(screen.getByRole('link', { name: 'Voltar para Contas e cartões' })).toHaveAttribute(
      'href',
      '/accounts',
    );
  });

  it('marks a plan of the bank and gives it no menu', async () => {
    await openPlans('Roxinho');

    const row = (await screen.findByText('Notebook Aero 14', undefined, LONG_WAIT)).closest('li');
    expect(within(row as HTMLElement).getByText('Do banco')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ações de Notebook Aero 14' })).toBeNull();
  });

  it('opens a plan to show its installments with day, invoice and value', async () => {
    const user = userEvent.setup();
    await openPlans('Bradesco Black');

    const trigger = await screen.findByRole('button', { name: 'Parcelas de Tênis de corrida' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const list = await screen.findByRole('list', { name: 'Parcelas de Tênis de corrida' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(4);
    expect(within(list).getByText(/1\/4 · fatura de/)).toBeInTheDocument();
    expect(within(list).getByText('Próxima')).toBeInTheDocument();
  });

  it('folds the settled plans by default and shows them on "Mostrar"', async () => {
    const user = userEvent.setup();
    const created = await callApi('POST', '/installment-plans', {
      accountId: cardId('Bradesco Black'),
      description: 'Fogão antigo',
      totalCents: 40_000,
      installmentCount: 2,
      firstInvoiceMonth: '2025-01',
      purchaseOn: '2025-01-10',
    });
    expect(created.status).toBe(201);
    await openPlans('Bradesco Black');

    const toggle = await screen.findByRole('button', { name: 'Mostrar (1)' }, LONG_WAIT);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Fogão antigo')).toBeNull();

    await user.click(toggle);

    expect(screen.getByRole('button', { name: 'Ocultar' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('Fogão antigo').closest('[inert]')).toBeNull();
    expect(screen.getByText('Fogão antigo').closest('li')).toHaveTextContent('Quitada');
  });

  it('shows the loading state and then the error with "Tentar de novo"', async () => {
    server.use(
      http.get('/api/installment-plans', () =>
        HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'Erro' }, { status: 500 }),
      ),
    );
    renderApp(`/cards/${cardId('Roxinho')}/installments`);

    expect(
      await screen.findByText('Não deu para carregar as compras parceladas', undefined, LONG_WAIT),
    ).toBeInTheDocument();

    server.resetHandlers();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));

    expect(await screen.findByText('Notebook Aero 14', undefined, LONG_WAIT)).toBeInTheDocument();
  });

  it('says so when the card has no plan and creates one from the button, with the card fixed', async () => {
    const user = userEvent.setup();
    server.use(http.get('/api/installment-plans', () => HttpResponse.json({ items: [] })));
    await openPlans('Roxinho');

    expect(
      await screen.findByRole('heading', { name: 'Nenhuma compra parcelada neste cartão' }),
    ).toBeInTheDocument();
    server.resetHandlers();

    await user.click(screen.getAllByRole('button', { name: 'Nova compra parcelada' })[0]!);

    const dialog = await screen.findByRole('dialog', { name: 'Compra parcelada' }, LONG_WAIT);
    // The card is text: no choice of card in the form.
    expect(within(dialog).getByText('Roxinho')).toBeInTheDocument();
    expect(within(dialog).queryByRole('radio', { name: 'Bradesco Black' })).toBeNull();
    await user.type(within(dialog).getByRole('textbox', { name: 'Valor total' }), '120000');
    await user.type(within(dialog).getByRole('textbox', { name: 'Descrição' }), 'Cadeira nova');
    await user.click(within(dialog).getByRole('button', { name: '6 parcelas' }));
    await user.click(within(dialog).getByRole('button', { name: 'Lançar compra' }));

    expect(
      await screen.findByText(/Cadeira nova lançada em 6 parcelas/, undefined, LONG_WAIT),
    ).toBeInTheDocument();
    const created = db.installmentPlans.find((plan) => plan.description === 'Cadeira nova');
    expect(created?.accountId).toBe(cardId('Roxinho'));
    await waitFor(() => expect(window.location.search).not.toContain('new='));
  });

  it('edits a plan in the same form: filled, with the preview and the recalculation note', async () => {
    const user = userEvent.setup();
    await openPlans('Bradesco Black');
    await openRowMenu('Tênis de corrida', 'Editar');

    const dialog = await screen.findByRole(
      'dialog',
      { name: 'Editar compra parcelada' },
      LONG_WAIT,
    );
    expect(within(dialog).getByRole('textbox', { name: 'Descrição' })).toHaveValue(
      'Tênis de corrida',
    );
    expect(within(dialog).getByText('Bradesco Black')).toBeInTheDocument();
    expect(within(dialog).queryByText(/As parcelas serão recalculadas/)).toBeNull();

    const total = within(dialog).getByRole('textbox', { name: 'Valor total' });
    await user.clear(total);
    await user.type(total, '80000');
    await user.click(within(dialog).getByRole('button', { name: '10 parcelas' }));

    const preview = await within(dialog).findByRole('region', { name: 'Prévia das parcelas' });
    expect(preview).toHaveTextContent(/10×/);
    expect(preview).toHaveTextContent(/80,00/);
    expect(within(dialog).getByText(/As parcelas serão recalculadas/)).toBeVisible();

    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Tênis de corrida atualizada.', undefined, LONG_WAIT),
    ).toBeInTheDocument();
    const saved = db.installmentPlans.find((plan) => plan.description === 'Tênis de corrida');
    expect(saved).toMatchObject({ totalCents: 80_000, installmentCount: 10 });
    expect(db.transactions.filter((tx) => tx.installment?.planId === saved?.id)).toHaveLength(10);
    await waitFor(() => expect(window.location.search).not.toContain('edit='));
    expect(await screen.findByText(/Parcela \d de 10/)).toBeInTheDocument();
  });

  it('shows the error of the API inside the edit form, with the month written by name', async () => {
    const user = userEvent.setup();
    server.use(
      http.patch('/api/installment-plans/:id', () =>
        HttpResponse.json(
          {
            code: 'INSTALLMENT_INVOICE_PAID',
            message: 'A fatura de 2026-12 já tem pagamento registrado.',
            details: { invoiceMonth: '2026-12' },
          },
          { status: 422 },
        ),
      ),
    );
    await openPlans('Bradesco Black');
    await openRowMenu('Tênis de corrida', 'Editar');

    const dialog = await screen.findByRole(
      'dialog',
      { name: 'Editar compra parcelada' },
      LONG_WAIT,
    );
    await user.type(within(dialog).getByRole('textbox', { name: 'Descrição' }), ' novo');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    expect(
      await within(dialog).findByText(/A fatura de dezembro de 2026 já tem pagamento registrado/),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(/2026-12/)).toBeNull();
  });

  it('sends only the field that changed, and nothing when nothing changed', async () => {
    const user = userEvent.setup();
    const bodies: unknown[] = [];
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'PATCH')
        void request
          .clone()
          .json()
          .then((body) => bodies.push(body));
    });
    await openPlans('Bradesco Black');

    await openRowMenu('Tênis de corrida', 'Editar');
    let dialog = await screen.findByRole('dialog', { name: 'Editar compra parcelada' }, LONG_WAIT);
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    await waitFor(() => expect(window.location.search).not.toContain('edit='));
    expect(bodies).toEqual([]);

    await openRowMenu('Tênis de corrida', 'Editar');
    dialog = await screen.findByRole('dialog', { name: 'Editar compra parcelada' }, LONG_WAIT);
    await user.type(within(dialog).getByRole('textbox', { name: 'Descrição' }), ' x');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(bodies).toEqual([{ description: 'Tênis de corrida x' }]));
    server.events.removeAllListeners();
  });

  it('edits the total only: no switch to the value of the installment', async () => {
    await openPlans('Bradesco Black');
    await openRowMenu('Tênis de corrida', 'Editar');

    const dialog = await screen.findByRole(
      'dialog',
      { name: 'Editar compra parcelada' },
      LONG_WAIT,
    );

    expect(within(dialog).queryByRole('radio', { name: 'Valor da parcela' })).toBeNull();
    expect(within(dialog).getByRole('textbox', { name: 'Valor total' })).toHaveValue('599,60');
  });

  it('keeps everything when the delete is cancelled, and shows the error of a failed one', async () => {
    const user = userEvent.setup();
    await openPlans('Bradesco Black');
    await openRowMenu('Tênis de corrida', 'Excluir');
    let dialog = await screen.findByRole('alertdialog', { name: 'Excluir esta compra parcelada?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(window.location.search).not.toContain('remove='));
    expect(db.installmentPlans.some((plan) => plan.description === 'Tênis de corrida')).toBe(true);

    server.use(
      http.delete('/api/installment-plans/:id', () =>
        HttpResponse.json(
          { code: 'INSTALLMENT_PLAN_NOT_FOUND', message: 'O plano não existe' },
          { status: 404 },
        ),
      ),
    );
    await openRowMenu('Tênis de corrida', 'Excluir');
    dialog = await screen.findByRole('alertdialog', { name: 'Excluir esta compra parcelada?' });
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByText('Essa compra parcelada não existe mais.')).toBeInTheDocument();
    expect(screen.getByText('Tênis de corrida', { selector: 'button' })).toBeInTheDocument();
  });

  it('says the card does not exist for an unknown card and for an account that is not a card', async () => {
    renderApp('/cards/11111111-1111-4111-8111-111111111111/installments');
    expect(
      await screen.findByRole('heading', { name: 'Esse cartão não existe' }, LONG_WAIT),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nova compra parcelada' })).toBeNull();
    cleanup();

    const checking = db.accounts.find((item) => item.type === 'checking');
    if (!checking) throw new Error('The seed has no checking account');
    renderApp(`/cards/${checking.id}/installments`);
    expect(
      await screen.findByRole('heading', { name: 'Esse cartão não existe' }, LONG_WAIT),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nova compra parcelada' })).toBeNull();
  });

  it('asks before deleting and takes the plan and its installments out', async () => {
    const user = userEvent.setup();
    await openPlans('Bradesco Black');
    const planId = db.installmentPlans.find((plan) => plan.description === 'Tênis de corrida')?.id;
    await openRowMenu('Tênis de corrida', 'Excluir');

    const dialog = await screen.findByRole('alertdialog', {
      name: 'Excluir esta compra parcelada?',
    });
    expect(dialog).toHaveTextContent(/As 4 parcelas somem das faturas/);
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    expect(
      await screen.findByText(/Tênis de corrida excluída/, undefined, LONG_WAIT),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText('Tênis de corrida', { selector: 'button' })).toBeNull(),
    );
    expect(db.installmentPlans.some((plan) => plan.id === planId)).toBe(false);
    expect(db.transactions.some((tx) => tx.installment?.planId === planId)).toBe(false);
  });
});
