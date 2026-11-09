import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { RecurrenceTransactions } from '#/components/recurrences/recurrence-transactions.component.tsx';

const transactions = [
  { id: 'a', dateLabel: '03/10', description: 'Pix recebido Vale Verde', amountCents: 300000 },
  { id: 'b', dateLabel: '30/12/2025', description: 'Pix complemento', amountCents: 120000 },
];

describe('RecurrenceTransactions', () => {
  it('writes day, description and amount of each linked transaction, with the sign of the flow', () => {
    const html = renderToStaticMarkup(
      <RecurrenceTransactions
        label="Transações de Salário"
        flow="income"
        transactions={transactions}
        emptyLabel="Nenhuma"
      />,
    );

    expect(html).toContain('aria-label="Transações de Salário"');
    expect(html).toContain('03/10');
    expect(html).toContain('Pix recebido Vale Verde');
    expect(html).toContain('3.000,00');
    expect(html).toContain('30/12/2025');
    expect(html).toContain('1.200,00');
    expect(html).toContain('text-gain');
    expect(html).toContain('+');
    // A date with the year does not wrap.
    expect(html).toContain('whitespace-nowrap');
  });

  it('cuts a long description on one line and keeps the whole text in the title', () => {
    const html = renderToStaticMarkup(
      <RecurrenceTransactions
        label="Transações"
        flow="expense"
        transactions={transactions}
        emptyLabel="Nenhuma"
      />,
    );

    expect(html).toContain('title="Pix recebido Vale Verde"');
    expect(html).toContain('truncate');
    expect(html).toContain('text-loss');
  });

  it('says what it was given when no transaction is linked', () => {
    const html = renderToStaticMarkup(
      <RecurrenceTransactions
        label="Transações"
        flow="income"
        transactions={[]}
        emptyLabel="Nenhuma transação vinculada neste mês"
      />,
    );

    expect(html).toContain('Nenhuma transação vinculada neste mês');
    expect(html).not.toContain('<ul');
  });
});
