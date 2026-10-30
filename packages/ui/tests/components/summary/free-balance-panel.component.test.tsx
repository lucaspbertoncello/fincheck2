import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MoneyVisibilityContext } from '#/components/money/money-visibility.context.ts';
import type { FreeBalanceData } from '#/components/summary/free-balance.type.ts';
import { FreeBalancePanel } from '#/components/summary/free-balance-panel.component.tsx';

const noop = () => undefined;

const DATA: FreeBalanceData = {
  freeCents: 584684,
  perDayCents: 58468,
  windowDays: 10,
  elapsedDays: 1,
  staleNote: 'dado do Bradesco de ontem',
  lines: [
    { key: 'balance', label: 'Saldo nas contas', cents: 540898, sign: 'plus', items: [] },
    {
      key: 'receivable',
      label: 'A receber',
      subtitle: 'R$ 4.200,00 ainda esperado (Maxxy)',
      cents: 462500,
      sign: 'plus',
      items: [{ id: 'maxxy', label: 'Maxxy', cents: 420000 }],
    },
    { key: 'payable', label: 'A pagar', cents: 418714, sign: 'minus', items: [] },
  ],
  review: { count: 12, subtitle: 'Sem categoria, do Bradesco', href: '/transactions' },
  accounts: [
    { id: 'nu', name: 'Nubank', subtitle: 'Sincronizado há 12 min', balanceCents: 341258 },
    {
      id: 'brad',
      name: 'Bradesco',
      subtitle: 'Ontem, 18:40',
      subtitleTone: 'warn',
      balanceCents: 187640,
    },
  ],
  invoices: [
    { id: 'roxinho', name: 'Roxinho', subtitle: 'Aberta, vence 06/11', amountCents: 213745 },
  ],
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
  it('draws the data it receives: value, per day, composition, review, accounts and invoices', () => {
    const html = render(DATA);

    expect(html).toContain('Livre até o fim do mês');
    expect(html).toContain('5.846,84');
    expect(html).toContain('585');
    expect(html).toContain('10 dias até o fim do mês');
    expect(html).toContain('dado do Bradesco de ontem');
    expect(html).toContain('Saldo nas contas');
    expect(html).toContain('A pagar');
    expect(html).toContain('Para revisar');
    expect(html).toContain('Nubank');
    expect(html).toContain('Faturas abertas');
    expect(html).toContain('Roxinho');
  });

  it('has the eye named by its state', () => {
    expect(render(DATA)).toContain('aria-label="Ocultar valores"');
    expect(render(DATA, true)).toContain('aria-label="Mostrar valores"');
  });

  it('hides every amount with the eye on', () => {
    const html = render(DATA, true);

    expect(html).not.toContain('5.846,84');
    expect(html).not.toContain('3.412,58');
    expect(html).toContain('••••');
  });

  it('shows the skeleton, busy and without numbers, when there is no data', () => {
    const html = render(undefined);

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Carregando');
    expect(html).not.toMatch(/\d\.\d{3},\d{2}/);
  });

  it('has a compact version with the value and a skeleton of its own', () => {
    expect(render(DATA, false, 'compact')).toContain('5.846,84');
    expect(render(DATA, false, 'compact')).not.toContain('Faturas abertas');
    expect(render(undefined, false, 'compact')).toContain('aria-busy="true"');
  });
});
