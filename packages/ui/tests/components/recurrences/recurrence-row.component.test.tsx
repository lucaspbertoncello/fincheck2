import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { MoneyVisibilityContext } from '#/components/money/index.ts';
import { RecurrenceList, RecurrenceRow } from '#/components/recurrences/index.ts';

// The layout depends on the width: below the desktop the detail, the references and the bar go to
// the strip under the row; from it they stay in the row. The tests choose the width here.
const viewport = vi.hoisted(() => ({ desktop: false }));
vi.mock('#/hooks/viewport/index.ts', () => ({ useMediaQuery: () => viewport.desktop }));

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

const PARTIAL = {
  flow: 'income',
  status: 'partial',
  amountCents: 42500,
  expectedCents: 85000,
  remainingCents: 42500,
} as const;

function render(overrides: Partial<Parameters<typeof RecurrenceRow>[0]> = {}, desktop = false) {
  viewport.desktop = desktop;

  return renderToStaticMarkup(row(overrides));
}

describe('RecurrenceRow', () => {
  it('writes name, rule, account, state and the amount with the minus sign', () => {
    const html = render();

    expect(html).toContain('Academia Corpo');
    expect(html).toContain('Todo dia 25');
    expect(html).toContain('Bradesco, débito');
    expect(html).toContain('Esperado');
    expect(html).toContain('Em 3 dias');
    expect(html).toContain('109,90');
    expect(html).toContain('−');
    expect(html).toContain('w-sign-col');
  });

  it('puts aria-expanded and aria-controls on the name button of a row that opens', () => {
    const opens = render({ transactions: [] });
    const fixed = render();

    const nameButton =
      /<button(?=[^>]*aria-label="Transações de Academia Corpo")(?=[^>]*aria-expanded="false")(?=[^>]*aria-controls=")/;

    expect(opens).toMatch(nameButton);
    expect(fixed).not.toMatch(nameButton);
    expect(fixed).not.toContain('aria-controls');
  });

  it('shows "+" and the income tone for income', () => {
    const html = render({ flow: 'income', status: 'received', amountCents: 120000 });

    expect(html).toContain('+');
    expect(html).toContain('text-gain');
    expect(html).toContain('Confirmado');
  });

  describe('the detail', () => {
    const FULL = 'Em 3 dias · Todo dia 25 · Bradesco, débito';

    it('below the desktop shows the whole text on the strip, as many lines as it takes', () => {
      const html = render();

      expect(html).toContain(`>${FULL}</p>`);
      // The strip lines start at the text, not at the mark.
      expect(html).toContain('basis-full pl-12');
      // No clipped detail in the row itself, no ellipsis.
      expect(html).not.toContain('truncate">Em 3 dias');
      expect(html).not.toContain('title="Em 3 dias');
    });

    it('from the desktop is one line cut with an ellipsis, the whole text in the title', () => {
      const html = render({}, true);

      expect(html).toContain(`title="${FULL}"`);
      expect(html).toContain(`block min-w-0 truncate">${FULL}`);
      expect(html).not.toContain('basis-full pl-12');
    });

    it('in the "reason" mode is the reason alone', () => {
      const reason = {
        detailMode: 'reason',
        status: 'late',
        statusNote: 'Venceu 20/10, sem pagamento ligado',
      } as const;

      for (const desktop of [false, true]) {
        const html = render(reason, desktop);

        expect(html).toContain('Venceu 20/10, sem pagamento ligado');
        expect(html).not.toContain('Todo dia 25');
      }
    });
  });

  describe('the amounts', () => {
    it('keeps only the main value in the value column below the desktop, the references on the strip under the text', () => {
      const html = render(PARTIAL);

      expect(html).toContain('425,00');
      expect(html).toContain('previstos');
      expect(html).toContain('faltam');
      expect(html).toContain('role="progressbar"');
      expect(html).toContain('width:50%');
      // Value column, then the "…" menu, then the strip with the references and the bar.
      expect(html.indexOf('425,00')).toBeLessThan(html.indexOf('Ações de Academia Corpo'));
      expect(html.indexOf('Ações de Academia Corpo')).toBeLessThan(html.indexOf('previstos'));
      expect(html.indexOf('previstos')).toBeLessThan(html.indexOf('role="progressbar"'));
      // The parts break only between them, never in the middle of a value.
      expect(html).toContain('flex-wrap gap-x-s12');
      expect(html).toContain('whitespace-nowrap');
    });

    it('writes the references under the main value from the desktop, one per line', () => {
      const html = render(PARTIAL, true);

      expect(html.indexOf('Academia Corpo')).toBeLessThan(html.indexOf('425,00'));
      expect(html.indexOf('425,00')).toBeLessThan(html.indexOf('previstos'));
      expect(html.indexOf('previstos')).toBeLessThan(html.indexOf('faltam'));
      expect(html.indexOf('faltam')).toBeLessThan(html.indexOf('Ações de Academia Corpo'));
      expect(html).toContain('flex-col items-end');
      expect(html).toContain('role="progressbar"');
      expect(html).not.toContain('basis-full pl-12');
    });

    it('shows the expected amount on a confirmed row, with no "faltam"', () => {
      const html = render({
        flow: 'income',
        status: 'received',
        amountCents: 260000,
        expectedCents: 260000,
      });

      expect(html).toContain('previstos');
      expect(html).not.toContain('faltam');
      expect(html).not.toContain('role="progressbar"');
    });

    it('shows what came in above the expected amount, never hiding the excess', () => {
      for (const desktop of [false, true]) {
        const html = render(
          {
            flow: 'income',
            status: 'received',
            amountCents: 290000,
            expectedCents: 260000,
            excessCents: 30000,
          },
          desktop,
        );

        expect(html).toContain('2.900,00');
        expect(html).toContain('2.600,00');
        expect(html).toContain('300,00');
        expect(html).toContain('a mais');
      }
    });

    it('says it is a forecast while nothing came in, and says nothing on a dismissed month', () => {
      expect(render()).toContain('previsto');
      expect(render()).not.toContain('previstos');
      expect(render({ status: 'late' })).toContain('previsto');
      expect(render({ status: 'dismissed' })).not.toContain('previsto');
    });

    it('hides the reference amounts when the eye is on', () => {
      for (const desktop of [false, true]) {
        viewport.desktop = desktop;
        const html = renderToStaticMarkup(
          <MoneyVisibilityContext value>{row(PARTIAL)}</MoneyVisibilityContext>,
        );

        expect(html).not.toContain('850,00');
        expect(html).not.toContain('425,00');
      }
    });
  });

  it('is a fixed row (no button over it) unless it is given the transactions', () => {
    const html = render();

    expect(html).not.toContain('Transações de Academia Corpo');
    expect(html).not.toContain('chevron');
  });

  it('opens on the name button, which stretches over the row, with the chevron next to the state', () => {
    const html = render({ transactions: [] });

    expect(html).toContain('aria-label="Transações de Academia Corpo"');
    // The panel is closed: inert, hidden and not mounted.
    expect(html).toContain('inert');
    expect(html).toContain('grid-rows-[0fr]');
    expect(html).not.toContain('Nenhuma transação vinculada');
    // The "…" menu stays outside of the name button.
    expect(html.indexOf('Transações de Academia Corpo')).toBeLessThan(
      html.indexOf('Ações de Academia Corpo'),
    );
    // The state and the chevron are one piece, so the chevron never sits alone on a line.
    expect(html).toContain('inline-flex items-center gap-s4"><span');
  });

  it('shows one badge (the state) and puts the decisions on the strip under the text', () => {
    const html = render({ status: 'late', inlineActions: ['mark-done'] });

    expect(html.match(/rounded-capsule font-plain/g)).toHaveLength(1);
    expect(html).toContain('lg:col-start-2');
  });

  it('marks late, different and paid-unlinked states', () => {
    expect(render({ status: 'late' })).toContain('Atrasado');
    expect(render({ status: 'different' })).toContain('Valor diferente');
    expect(render({ status: 'paid-unlinked' })).toContain('Pago, falta vincular');
  });

  it('fades a dismissed month and strikes the name', () => {
    const html = render({ status: 'dismissed' });

    expect(html).toContain('Dispensada');
    expect(html).toContain('line-through');
    expect(html).toContain('text-fg-tertiary');
  });

  it('draws the inline actions with the label of the flow', () => {
    const html = render({ flow: 'income', inlineActions: ['mark-done', 'link', 'edit-expected'] });

    expect(html).toContain('Marcar como recebida');
    expect(html).toContain('Vincular transação');
    expect(html).toContain('Editar valor esperado');
    expect(render({ inlineActions: ['mark-done'] })).toContain('Marcar como paga');
  });

  it('has an accessible "…" menu named after the row', () => {
    expect(render()).toContain('aria-label="Ações de Academia Corpo"');
  });

  it('hides the amount and the sign when the eye is on', () => {
    viewport.desktop = false;
    const html = renderToStaticMarkup(
      <MoneyVisibilityContext value>{row()}</MoneyVisibilityContext>,
    );

    expect(html).toContain('••••');
    expect(html).not.toContain('109,90');
    expect(html).not.toContain('−');
  });
});
