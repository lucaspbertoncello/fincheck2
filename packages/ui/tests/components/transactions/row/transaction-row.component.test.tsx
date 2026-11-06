import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MoneyVisibilityContext } from '#/components/money/index.ts';
import {
  BankChangedNotice,
  BankDifferenceBox,
  CategorySuggestion,
  TransactionDayGroup,
  TransactionRow,
  type TransactionRowData,
} from '#/components/transactions/index.ts';

const noop = () => {};

const base: TransactionRowData = {
  id: 't1',
  name: 'Padaria Estrela',
  kind: 'expense',
  amountCents: -4590,
  categoryIcon: 'food',
  categoryName: 'Restaurantes',
  accountLabel: 'Nubank, crédito',
};

function row(overrides: Partial<TransactionRowData> = {}, selection = {}) {
  return renderToStaticMarkup(
    <ul>
      <TransactionRow transaction={{ ...base, ...overrides }} {...selection} />
    </ul>,
  );
}

describe('TransactionRow', () => {
  it('writes name, category, account, amount and the row menu', () => {
    const html = row();

    expect(html).toContain('Padaria Estrela');
    expect(html).toContain('Restaurantes');
    expect(html).toContain('Nubank, crédito');
    expect(html).toContain('45,90');
    expect(html).toContain('−');
    expect(html).toContain('aria-label="Ações de Padaria Estrela"');
    expect(html).toContain('data-type="expense"');
  });

  it('keeps the name on one line with its full text in the title (standard row)', () => {
    const name = 'MOCOTO RESTAURANTE E LANCHONETE DO CENTRO';
    const html = row({ name });

    expect(html).toContain('truncate');
    expect(html).toContain(`title="${name}"`);
    expect(html).not.toContain('line-clamp-2 text-body');
  });

  it('is the standard list row: icon, text, amount with the sign column, menu column, no own height', () => {
    const html = row();

    expect(html).toContain('grid-cols-[auto_minmax(0,1fr)_auto_auto]');
    expect(html).toContain('py-s12');
    expect(html).not.toContain('min-h-18');
    expect(html).toContain('w-sign-col');
    expect(html).toContain('col-start-4');
    expect(html.indexOf('data-type="expense"')).toBeLessThan(html.indexOf('Padaria Estrela'));
    expect(html.indexOf('Padaria Estrela')).toBeLessThan(html.indexOf('45,90'));
    expect(html.indexOf('45,90')).toBeLessThan(html.indexOf('Ações de Padaria Estrela'));
  });

  it('writes category and account on one detail line, with the full text in the title', () => {
    const html = row();

    expect(html).toContain('title="Restaurantes · Nubank, crédito"');
    expect(html).toContain('text-label text-fg-secondary');
  });

  it('shows at most two chips and moves the rest to the detail line', () => {
    const html = row({
      pending: true,
      toReview: true,
      edited: true,
      installment: { number: 3, total: 10 },
      tags: ['delivery'],
    });
    const chipCount = (html.match(/rounded-capsule font-plain whitespace-nowrap/g) ?? []).length;

    expect(html).toContain('Pendente');
    expect(html).toContain('Para revisar');
    expect(html).toContain(
      'title="Restaurantes · Nubank, crédito · Editada · Parcela 3 de 10 · #delivery"',
    );
    expect(chipCount).toBe(2);
  });

  it('keeps the title off the detail line when the overflow carries money', () => {
    const html = row({ pending: true, toReview: true, debtPaidCents: 15000, debtPerson: 'Rafa' });

    expect(html).toContain('Abateu');
    expect(html).not.toContain('title="Restaurantes');
  });

  it('paints the expense amount red with "−", the R$ prefix too, and leaves ignored ones faded', () => {
    const html = row();
    const money = /<span class="money-numeric[^"]*text-loss[^"]*">.*?<\/span><\/span>/.exec(html);

    expect(money?.[0].match(/text-loss/g)).toHaveLength(2);
    expect(row({ ignored: true })).not.toMatch(/money-numeric[^"]*text-loss/);
  });

  it('shows income with "+" in the income color and a green type badge', () => {
    const html = row({ kind: 'income', amountCents: 260000, name: 'Salário' });

    expect(html).toContain('+');
    expect(html).toContain('text-gain');
    expect(html).toContain('data-type="income"');
  });

  it('shows installment, pending, review, edited and bank-changed chips', () => {
    const html = row({
      installment: { number: 3, total: 10 },
      pending: true,
      toReview: true,
      edited: true,
      bankChanged: true,
    });

    expect(html).toContain('Parcela 3 de 10');
    expect(html).toContain('Pendente');
    expect(html).toContain('Para revisar');
    expect(html).toContain('Editada');
    expect(html).toContain('Banco alterou o original');
  });

  it('shows split, tags and the debt it settled', () => {
    const html = row({
      splitParts: 2,
      tags: ['delivery'],
      debtPaidCents: 15000,
      debtPerson: 'Rafa',
    });

    expect(html).toContain('Dividida em 2');
    expect(html).toContain('delivery');
    expect(html).toContain('Abateu');
    expect(html).toContain('150,00');
    expect(html).toContain('da dívida com Rafa');
  });

  it('draws a transfer out of the account with a muted amount and the "Fora da conta" chip', () => {
    const html = row({
      kind: 'transfer',
      name: 'Nubank para Bradesco',
      outOfAccount: true,
      amountCents: -50000,
    });

    expect(html).toContain('data-type="transfer"');
    expect(html).toContain('Fora da conta');
    expect(html).toContain('text-fg-tertiary');
  });

  it('draws an ignored transaction muted and struck through, with its own menu', () => {
    const html = row({ ignored: true });

    expect(html).toContain('data-ignored="true"');
    expect(html).toContain('Ignorada');
    expect(html).toContain('line-through');
    expect(html).toContain('opacity-60');
  });

  it('draws a transaction with no category with a dashed icon', () => {
    expect(row({ uncategorized: true, categoryName: undefined })).toContain('border-dashed');
  });

  it('writes "Sem categoria" in the metadata when there is no category name', () => {
    const html = row({ uncategorized: true, categoryName: undefined });
    expect(html).toContain('Sem categoria');
    expect(row({ categoryName: 'Delivery' })).not.toContain('Sem categoria');
  });

  it('hides the amount, the sign and the debt value when the eye is on', () => {
    const html = renderToStaticMarkup(
      <MoneyVisibilityContext value>
        <ul>
          <TransactionRow transaction={{ ...base, debtPaidCents: 15000 }} />
        </ul>
      </MoneyVisibilityContext>,
    );

    expect(html).toContain('••••');
    expect(html).toContain('valor oculto');
    expect(html).not.toContain('45,90');
    expect(html).not.toContain('150,00');
    expect(html).not.toContain('−');
  });

  it('shows a labelled checkbox and the selected background in selection mode', () => {
    const html = row({}, { selectionMode: true, selected: true });

    expect(html).toContain('type="checkbox"');
    expect(html).toContain('aria-label="Selecionar Padaria Estrela"');
    expect(html).toContain('bg-brand-weak');
    expect(html).toContain('data-selected="true"');
  });

  it('has no checkbox outside selection mode', () => {
    expect(row()).not.toContain('type="checkbox"');
  });

  it('renders the detail boxes under the row', () => {
    const html = renderToStaticMarkup(
      <ul>
        <TransactionRow transaction={base}>
          <BankDifferenceBox
            bankName="PADARIA ESTRELA 12"
            bankCents={5000}
            yourName="Padaria Estrela"
            yourCents={4590}
            note="Valor corrigido."
            onRestoreOriginal={noop}
          />
        </TransactionRow>
      </ul>,
    );

    expect(html).toContain('PADARIA ESTRELA 12');
    expect(html).toContain('line-through');
    expect(html).toContain('Restaurar original');
  });
});

describe('detail boxes', () => {
  it('asks which amount wins when the bank changed it', () => {
    const html = renderToStaticMarkup(
      <BankChangedNotice
        previousCents={5280}
        currentCents={4680}
        onUseBank={noop}
        onKeepMine={noop}
        onShowDifference={noop}
      />,
    );

    expect(html).toContain('52,80');
    expect(html).toContain('46,80');
    expect(html).toContain('Qual vale?');
    expect(html).toContain('Usar o valor do banco');
    expect(html).toContain('Manter o meu');
    expect(html).toContain('Ver diferença');
    expect(html).toContain('bg-caution-weak');
  });

  it('suggests a category with "Escolher outra"', () => {
    const html = renderToStaticMarkup(
      <CategorySuggestion
        suggestion={{ id: 'food', name: 'Restaurantes', icon: 'food' }}
        onAccept={noop}
        onChooseOther={noop}
      />,
    );

    expect(html).toContain('Parece');
    expect(html).toContain('Restaurantes');
    expect(html).toContain('Escolher outra');
  });
});

describe('TransactionDayGroup', () => {
  it('writes the day, the date, the count and the total, then the rows', () => {
    const html = renderToStaticMarkup(
      <TransactionDayGroup title="Hoje" dateLabel="22 de outubro" count={2} totalCents={-9230}>
        <TransactionRow transaction={base} />
      </TransactionDayGroup>,
    );

    expect(html).toContain('Hoje');
    expect(html).toContain('22 de outubro');
    expect(html).toContain('2 transações');
    expect(html).toContain('92,30');
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('Padaria Estrela');
  });

  it('uses the singular for one transaction', () => {
    const html = renderToStaticMarkup(
      <TransactionDayGroup title="Ontem" dateLabel="21 de outubro" count={1} totalCents={-100}>
        <TransactionRow transaction={base} />
      </TransactionDayGroup>,
    );

    expect(html).toContain('1 transação');
    expect(html).not.toContain('1 transações');
  });
});
