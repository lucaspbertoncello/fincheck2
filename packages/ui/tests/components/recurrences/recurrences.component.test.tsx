import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MoneyVisibilityContext } from '#/components/money/index.ts';
import {
  BillRow,
  buildRecurrenceMenu,
  DateRulePicker,
  ExpectedValueUpdate,
  NeedsAttentionStrip,
  RecurrenceList,
  RecurrenceRow,
  TotalCard,
} from '#/components/recurrences/index.ts';

const noop = () => undefined;

function row(overrides: Partial<Parameters<typeof RecurrenceRow>[0]> = {}) {
  return (
    <RecurrenceList>
      <RecurrenceRow
        name="Academia Corpo"
        icon="gym"
        flow="expense"
        rule="Todo dia 25"
        account="Bradesco, débito"
        status="expected"
        statusNote="Em 3 dias"
        amountCents={10990}
        onAction={noop}
        {...overrides}
      />
    </RecurrenceList>
  );
}

describe('RecurrenceRow', () => {
  it('writes name, rule, account, state and the amount with the minus sign', () => {
    const html = renderToStaticMarkup(row());

    expect(html).toContain('Academia Corpo');
    expect(html).toContain('Todo dia 25');
    expect(html).toContain('Bradesco, débito');
    expect(html).toContain('Esperado');
    expect(html).toContain('Em 3 dias');
    expect(html).toContain('109,90');
    expect(html).toContain('−');
    expect(html).toContain('w-sign-col');
  });

  it('shows "+" and the income tone for income', () => {
    const html = renderToStaticMarkup(
      row({ flow: 'income', status: 'received', amountCents: 120000 }),
    );

    expect(html).toContain('+');
    expect(html).toContain('text-gain');
    expect(html).toContain('Confirmado');
  });

  it('shows the partial amount of the total with the bar', () => {
    const html = renderToStaticMarkup(
      row({ flow: 'income', status: 'partial', amountCents: 42500, totalCents: 85000 }),
    );

    expect(html).toContain('425,00');
    expect(html).toContain('850,00');
    expect(html).toContain('Parcial');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('width:50%');
  });

  it('writes the partial amount in two lines at the right end: "R$ 425" over "de R$ 850"', () => {
    const html = renderToStaticMarkup(
      row({ flow: 'income', status: 'partial', amountCents: 42500, totalCents: 85000 }),
    );

    expect(html.indexOf('425,00')).toBeLessThan(html.indexOf('850,00'));
    expect(html).toContain('>de <');
    expect(html).toContain('whitespace-nowrap');
    // The value column comes after the text and before the "…" menu.
    expect(html.indexOf('Academia Corpo')).toBeLessThan(html.indexOf('425,00'));
    expect(html.indexOf('850,00')).toBeLessThan(html.indexOf('Ações de Academia Corpo'));
  });

  it('writes state, rule and account on one truncated detail line, with the whole text in the title', () => {
    const html = renderToStaticMarkup(row());

    expect(html).toContain('title="Em 3 dias · Todo dia 25 · Bradesco, débito"');
    expect(html).toContain('truncate');
  });

  it('shows one badge (the state) and puts the decisions on the strip under the text', () => {
    const html = renderToStaticMarkup(row({ status: 'late', inlineActions: ['mark-done'] }));

    expect(html.match(/rounded-capsule font-plain/g)).toHaveLength(1);
    expect(html).toContain('lg:col-start-2');
  });

  it('in the "reason" mode the detail line is the reason alone', () => {
    const html = renderToStaticMarkup(
      row({
        detailMode: 'reason',
        status: 'late',
        statusNote: 'Venceu 20/10, sem pagamento ligado',
      }),
    );

    expect(html).toContain('title="Venceu 20/10, sem pagamento ligado"');
    expect(html).not.toContain('Todo dia 25');
  });

  it('marks late, different and paid-unlinked states', () => {
    expect(renderToStaticMarkup(row({ status: 'late' }))).toContain('Atrasado');
    expect(renderToStaticMarkup(row({ status: 'different' }))).toContain('Valor diferente');
    expect(renderToStaticMarkup(row({ status: 'paid-unlinked' }))).toContain(
      'Pago, falta vincular',
    );
  });

  it('fades a dismissed month and strikes the name', () => {
    const html = renderToStaticMarkup(row({ status: 'dismissed' }));

    expect(html).toContain('Dispensada');
    expect(html).toContain('line-through');
    expect(html).toContain('text-fg-tertiary');
  });

  it('draws the inline actions with the label of the flow', () => {
    const html = renderToStaticMarkup(
      row({ flow: 'income', inlineActions: ['mark-done', 'link', 'edit-expected'] }),
    );

    expect(html).toContain('Marcar como recebida');
    expect(html).toContain('Vincular transação');
    expect(html).toContain('Editar valor esperado');
    expect(renderToStaticMarkup(row({ inlineActions: ['mark-done'] }))).toContain(
      'Marcar como paga',
    );
  });

  it('has an accessible "…" menu named after the row', () => {
    expect(renderToStaticMarkup(row())).toContain('aria-label="Ações de Academia Corpo"');
  });

  it('hides the amount and the sign when the eye is on', () => {
    const html = renderToStaticMarkup(
      <MoneyVisibilityContext value>{row()}</MoneyVisibilityContext>,
    );

    expect(html).toContain('••••');
    expect(html).not.toContain('109,90');
    expect(html).not.toContain('−');
  });
});

describe('buildRecurrenceMenu', () => {
  const keys = (status: Parameters<typeof buildRecurrenceMenu>[1]) =>
    buildRecurrenceMenu('expense', status).map((item) => item.key);

  it('offers "Dispensar este mês" on an open occurrence', () => {
    expect(keys('expected')).toEqual([
      'mark-done',
      'link',
      'edit-expected',
      'dismiss',
      'edit',
      'pause',
      'delete',
    ]);
  });

  it('offers the undo on a dismissed one and no occurrence action on a confirmed one', () => {
    expect(keys('dismissed')).toEqual(['undismiss', 'edit', 'pause', 'delete']);
    expect(keys('received')).toEqual(['edit', 'pause', 'delete']);
  });

  it('asks only to link when paid but not linked', () => {
    expect(keys('paid-unlinked')).not.toContain('mark-done');
    expect(keys('paid-unlinked')).toContain('link');
  });

  it('puts the divider before the recurrence actions and makes delete dangerous', () => {
    const items = buildRecurrenceMenu('income', 'late');

    expect(items.find((item) => item.key === 'edit')?.separatorBefore).toBe(true);
    expect(items.find((item) => item.key === 'delete')?.danger).toBe(true);
    expect(items[0]?.label).toBe('Marcar como recebida');
  });
});

describe('NeedsAttentionStrip', () => {
  it('writes the title, the count chip and the rows', () => {
    const html = renderToStaticMarkup(
      <NeedsAttentionStrip countLabel="2 recorrências">
        {row({ name: 'Diarista Rosa', status: 'late' })}
      </NeedsAttentionStrip>,
    );

    expect(html).toContain('Precisa de você');
    expect(html).toContain('2 recorrências');
    expect(html).toContain('Diarista Rosa');
    expect(html).toContain('bg-caution-weak');
    expect(html).toContain('border-caution');
  });
});

describe('ExpectedValueUpdate', () => {
  it('asks to update and offers to keep the current amount', () => {
    const html = renderToStaticMarkup(
      <ExpectedValueUpdate newCents={2390} keptCents={2190} onUpdate={noop} onKeep={noop} />,
    );

    expect(html).toContain('Atualizar o valor esperado para');
    expect(html).toContain('23,90');
    expect(html).toContain('Atualizar');
    expect(html).toContain('Manter');
    expect(html).toContain('21,90');
  });
});

describe('BillRow', () => {
  it('writes an open bill with the badge, due text and the payment button', () => {
    const html = renderToStaticMarkup(
      <BillRow
        name="Internet Fibra"
        icon="wifi"
        flow="expense"
        status="open"
        badges={[{ label: 'Recorrente' }]}
        dueText="Vence 27/10, em 5 dias"
        amountCents={11990}
        onAction={noop}
      />,
    );

    expect(html).toContain('Recorrente');
    expect(html).toContain('Vence 27/10, em 5 dias');
    expect(html).toContain('119,90');
    expect(html).toContain('Registrar pagamento');
  });

  it('puts a second button beside the payment one, and keeps it on a settled row', () => {
    const open = renderToStaticMarkup(
      <BillRow
        name="Fatura Roxinho"
        icon="card"
        flow="expense"
        status="open"
        dueText="Vence 10/11"
        amountCents={100000}
        onAction={noop}
        secondaryAction={{ label: 'Ver fatura', onPress: noop }}
      />,
    );
    expect(open).toContain('Registrar pagamento');
    expect(open).toContain('Ver fatura');

    const settled = renderToStaticMarkup(
      <BillRow
        name="Fatura Roxinho"
        icon="card"
        flow="expense"
        status="settled"
        dueText="Paga em 05/11"
        amountCents={100000}
        secondaryAction={{ label: 'Ver fatura', onPress: noop }}
      />,
    );
    expect(settled).not.toContain('Registrar pagamento');
    expect(settled).toContain('Ver fatura');
  });

  it('marks a late bill', () => {
    const html = renderToStaticMarkup(
      <BillRow
        name="Diarista Rosa"
        icon="broom"
        flow="expense"
        status="late"
        dueText="Vence 20/10, venceu há 2 dias"
        amountCents={18000}
        onAction={noop}
      />,
    );

    expect(html).toContain('Atrasada');
  });

  it('shows a friend debt with the bar, paid and missing, and the receipt button', () => {
    const html = renderToStaticMarkup(
      <BillRow
        name="Marta, jantar"
        icon="food"
        flow="income"
        status="partial"
        badges={[{ label: 'Você pagou' }]}
        dueText="Sem data"
        amountCents={11600}
        settledCents={5800}
        onAction={noop}
      />,
    );

    expect(html).toContain('role="progressbar"');
    expect(html).toContain('falta');
    expect(html).toContain('58,00');
    expect(html).toContain('116,00');
    expect(html.indexOf('58,00')).toBeLessThan(html.indexOf('116,00'));
    expect(html).toContain('Registrar recebimento');
    expect(html).toContain('+');
  });

  it('shows "Pagamento encontrado" and, when paid but unlinked, "Vincular"', () => {
    const html = renderToStaticMarkup(
      <BillRow
        name="Fatura Banco Azul"
        icon="card"
        flow="expense"
        status="paid-unlinked"
        dueText="Vence 28/10"
        foundPayment="Pagamento encontrado no Banco Azul"
        amountCents={128490}
        onAction={noop}
      />,
    );

    expect(html).toContain('Pagamento encontrado no Banco Azul');
    expect(html).toContain('Pago, falta vincular');
    expect(html).toContain('>Vincular<');
  });

  it('fades a settled bill and drops the button', () => {
    const html = renderToStaticMarkup(
      <BillRow
        name="Fatura de setembro"
        icon="card"
        flow="expense"
        status="settled"
        dueText="Paga em 28/09"
        amountCents={110237}
        onAction={noop}
      />,
    );

    expect(html).toContain('Paga em 28/09');
    expect(html).toContain('text-fg-tertiary');
    expect(html).not.toContain('Registrar');
  });

  it('shows two badges at most: the status, the kind, and the payment found goes on the detail line', () => {
    const html = renderToStaticMarkup(
      <BillRow
        name="Fatura Bradesco Black"
        icon="card"
        flow="expense"
        status="paid-unlinked"
        badges={[{ label: 'Fatura' }, { label: 'Outro' }]}
        dueText="Vence 28/10"
        foundPayment="Pagamento encontrado no Bradesco"
        amountCents={128490}
        onAction={noop}
      />,
    );

    expect(html.match(/rounded-capsule font-plain/g)).toHaveLength(2);
    expect(html).toContain('Pago, falta vincular');
    expect(html).toContain('Fatura<');
    expect(html).not.toContain('Outro');
    expect(html).toContain('Vence 28/10 · Pagamento encontrado no Bradesco');
  });

  it('puts the button on the strip under the text, not at the right end', () => {
    const html = renderToStaticMarkup(
      <BillRow
        name="Internet Fibra"
        icon="wifi"
        flow="expense"
        status="open"
        dueText="Vence 27/10"
        amountCents={11990}
        onAction={noop}
      />,
    );

    expect(html.indexOf('119,90')).toBeLessThan(html.indexOf('Registrar pagamento'));
    expect(html).toContain('lg:col-start-2');
  });

  it('hides the amount when the eye is on', () => {
    const html = renderToStaticMarkup(
      <MoneyVisibilityContext value>
        <BillRow
          name="Internet Fibra"
          icon="wifi"
          flow="expense"
          status="open"
          dueText="Vence 27/10"
          amountCents={11990}
        />
      </MoneyVisibilityContext>,
    );

    expect(html).toContain('••••');
    expect(html).not.toContain('119,90');
  });
});

describe('TotalCard', () => {
  it('is a plain card without items', () => {
    const html = renderToStaticMarkup(
      <TotalCard label="Receitas esperadas em outubro" totalCents={842700} caption="3 recebidas" />,
    );

    expect(html).toContain('Receitas esperadas em outubro');
    expect(html).toContain('8.427,00');
    expect(html).toContain('3 recebidas');
    expect(html).not.toContain('aria-expanded');
  });

  it('starts closed: the head is the trigger of a collapsed, inert panel', () => {
    const html = renderToStaticMarkup(
      <TotalCard
        label="A pagar"
        totalCents={418714}
        items={[
          { key: 'a', label: 'Academia Corpo', note: 'vence 25/10', cents: 10990 },
          { key: 'b', label: 'Internet Fibra', cents: 11990 },
        ]}
      />,
    );

    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('4.187,14');
    expect(html).toContain('grid-rows-[0fr]');
    expect(html).toContain('inert=""');
    // The composition mounts when it opens (no heavy list while closed).
    expect(html).not.toContain('Academia Corpo');
    const controls = /aria-controls="([^"]+)"/.exec(html)?.[1];
    expect(html).toContain(`id="${controls}"`);
  });
});

describe('DateRulePicker', () => {
  const options = [
    { key: 'fixed', label: 'Dia fixo', hint: 'Todo dia 20', icon: 'calendar' as const },
    { key: 'business', label: 'Dia útil', icon: 'calendar-mark' as const },
    { key: 'around', label: 'Por volta do dia' },
    { key: 'any', label: 'Qualquer dia' },
  ];

  it('draws the 4 cards in a 2-column grid with the chosen one checked', () => {
    const html = renderToStaticMarkup(
      <DateRulePicker
        options={options}
        value="business"
        onChange={noop}
        label="Regra de data"
        preview={['sex, 06/11', 'ter, 08/12']}
      />,
    );

    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('grid-cols-2');
    expect(html).toContain('Dia fixo');
    expect(html).toContain('Todo dia 20');
    expect(html).toContain('Qualquer dia');
    expect(html.match(/type="radio"/g)).toHaveLength(4);
    expect(html.match(/checked=""/g)).toHaveLength(1);
  });

  it('shows the preview dates the caller computed, and none without them', () => {
    const withPreview = renderToStaticMarkup(
      <DateRulePicker
        options={options}
        value="fixed"
        onChange={noop}
        label="Regra de data"
        preview={['sex, 20/11']}
      />,
    );

    expect(withPreview).toContain('Próximas datas');
    expect(withPreview).toContain('sex, 20/11');
    expect(
      renderToStaticMarkup(
        <DateRulePicker options={options} value="fixed" onChange={noop} label="Regra de data" />,
      ),
    ).not.toContain('Próximas datas');
  });
});
