import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MoneyVisibilityContext } from '#/components/money/money-visibility.context.ts';
import type { FreeBalanceData } from '#/components/summary/free-balance.type.ts';
import { FreeBalancePanel } from '#/components/summary/free-balance-panel.component.tsx';

const noop = () => undefined;

const DATA: FreeBalanceData = {
  balanceCents: 10000000,
  freeCents: 584684,
  perDayCents: 58468,
  windowDays: 10,
  lines: [
    {
      key: 'receivable',
      label: 'A receber',
      subtitle: 'Maxxy e mais 2',
      cents: 462500,
      sign: 'plus',
      items: [{ id: 'maxxy', label: 'Maxxy', cents: 420000 }],
    },
    {
      key: 'payable',
      label: 'A pagar',
      subtitle: 'até 31/10',
      cents: 418714,
      sign: 'minus',
      items: [],
    },
  ],
  accounts: [
    { id: 'nu', name: 'Nubank', subtitle: 'Sincronizado há 12 min', balanceCents: 341258 },
    {
      id: 'brad',
      name: 'Bradesco',
      subtitle: 'Ontem, 18:40',
      subtitleTone: 'warn',
      balanceCents: 187640,
    },
    { id: 'wal', name: 'Carteira', subtitle: 'Saldo manual', balanceCents: 5000 },
    { id: 'inv', name: 'Corretora', subtitle: 'Saldo manual', balanceCents: 9000 },
  ],
  moreAccountsHref: '/accounts?month=2026-10',
};

function render(
  data: FreeBalanceData | undefined,
  hidden = false,
  variant: 'full' | 'compact' = 'full',
) {
  return renderToStaticMarkup(
    <MoneyVisibilityContext value={hidden}>
      <FreeBalancePanel data={data} variant={variant} isHidden={hidden} onToggleHidden={noop} />
    </MoneyVisibilityContext>,
  );
}

describe('FreeBalancePanel', () => {
  it('reads as a sum: balance, receivable, payable and what is left', () => {
    const html = render(DATA);

    expect(html).toContain('aria-label="Saldo em contas"');
    expect(html).toContain('100.000,00');
    expect(html).toContain('A receber');
    expect(html).toContain('A pagar');
    expect(html).toContain('Sobra no fim do mês');
    expect(html).toContain('5.846,84');
    expect(html).toContain('por dia');
  });

  it('no longer carries the bank notice, the invoices, the review row or the balance line', () => {
    const html = render(DATA);

    expect(html).not.toContain('Faturas abertas');
    expect(html).not.toContain('Para revisar');
    expect(html).not.toContain('Saldo nas contas');
    expect(html).not.toContain('dado do');
  });

  it('shows the receivable and the payable with their own icon', () => {
    const html = render(DATA);

    expect(html).toContain('bg-gain-weak');
    expect(html.match(/<svg/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('lists only the first two accounts and counts the rest in "Ver mais"', () => {
    const html = render(DATA);

    expect(html).toContain('Nubank');
    expect(html).toContain('Bradesco');
    expect(html).not.toContain('Carteira');
    expect(html).toContain('Ver mais · 2 contas');
    expect(html).toContain('href="/accounts?month=2026-10"');
  });

  it('has no "Ver mais" when every account fits', () => {
    const html = render({ ...DATA, accounts: DATA.accounts.slice(0, 2) });

    expect(html).not.toContain('Ver mais');
  });

  it('speaks in the singular on the last day of the month', () => {
    const html = render({ ...DATA, windowDays: 1 });

    expect(html).toContain('hoje');
    expect(html).not.toContain('por dia');
  });

  it('tightens its spacing on low windows instead of scrolling', () => {
    const html = render(DATA);

    expect(html).toContain('[@media(max-height:700px)]:p-s16');
    expect(html).not.toContain('overflow-y-auto');
  });

  it('has the eye named by its state', () => {
    expect(render(DATA)).toContain('aria-label="Ocultar valores"');
    expect(render(DATA, true)).toContain('aria-label="Mostrar valores"');
  });

  it('hides every amount with the eye on', () => {
    const html = render(DATA, true);

    expect(html).not.toContain('100.000,00');
    expect(html).not.toContain('5.846,84');
    expect(html).not.toContain('3.412,58');
    expect(html).toContain('••••');
  });

  it('shows the skeleton, busy and without numbers, when there is no data', () => {
    const html = render(undefined);

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Carregando');
    expect(html).not.toMatch(/d.d{3},d{2}/);
  });

  it('has a compact version with the balance and a skeleton of its own', () => {
    expect(render(DATA, false, 'compact')).toContain('100.000,00');
    expect(render(DATA, false, 'compact')).not.toContain('Ver mais');
    expect(render(undefined, false, 'compact')).toContain('aria-busy="true"');
  });
});
