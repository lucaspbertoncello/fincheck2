import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { InvoiceCard } from '#/components/bank-cards/index.ts';
import { MoneyVisibilityContext } from '#/components/money/index.ts';

const INSTALLMENTS = [
  { id: 'a', merchant: 'Loja Aurora', partLabel: 'Parcela 3 de 10', cents: 12990 },
  { id: 'b', merchant: 'Mercado Lume', partLabel: 'Parcela 2 de 4', cents: 8750 },
];

describe('InvoiceCard', () => {
  it('shows the total, the status, the due line and the installments', () => {
    const html = renderToStaticMarkup(
      <InvoiceCard
        status="open"
        totalCents={213745}
        dueLine="Fecha 30/10, vence 06/11"
        cycleProgress={0.5}
        installments={INSTALLMENTS}
        onOpenFuture={() => {}}
      />,
    );
    expect(html).toContain('2.137,45');
    expect(html).toContain('Fatura aberta');
    expect(html).toContain('Fecha 30/10, vence 06/11');
    expect(html).toContain('Loja Aurora');
    expect(html).toContain('Parcela 3 de 10');
    expect(html).toContain('129,90');
    expect(html).toContain('Faturas futuras');
    expect(html).toContain('aria-valuenow="50"');
  });

  it('writes "crédito de" for a negative total, without a minus sign', () => {
    const html = renderToStaticMarkup(
      <InvoiceCard status="closed" totalCents={-4500} dueLine="Venceu" installments={[]} />,
    );
    expect(html).toContain('crédito de');
    expect(html).toContain('45,00');
    expect(html).not.toContain('−');
  });

  it('shows an empty line without installments and hides the optional parts', () => {
    const html = renderToStaticMarkup(
      <InvoiceCard status="paid" totalCents={0} dueLine="Paga em 05/11" installments={[]} />,
    );
    expect(html).toContain('Nenhuma parcela nesta fatura.');
    expect(html).not.toContain('Faturas futuras');
    expect(html).not.toContain('progressbar');
    expect(html).toContain('Fatura paga');
  });

  it('hides every amount when the eye is on', () => {
    const html = renderToStaticMarkup(
      <MoneyVisibilityContext value>
        <InvoiceCard
          status="open"
          totalCents={213745}
          dueLine="Fecha 30/10"
          installments={INSTALLMENTS}
        />
      </MoneyVisibilityContext>,
    );
    expect(html).toContain('valor oculto');
    expect(html).not.toContain('2.137,45');
    expect(html).not.toContain('129,90');
  });

  it('keeps the actions at the foot, so a taller box (a row of equal heights) grows above them', () => {
    const html = renderToStaticMarkup(
      <InvoiceCard
        status="open"
        totalCents={1000}
        dueLine="Fecha 30/10, vence 06/11"
        installments={[]}
        actions={<button type="button">Ver fatura</button>}
        className="flex-1"
      />,
    );

    expect(html).toMatch(/class="mt-auto flex flex-wrap[^"]*"><button/);
    expect(html).toContain('flex-1');
  });
});
