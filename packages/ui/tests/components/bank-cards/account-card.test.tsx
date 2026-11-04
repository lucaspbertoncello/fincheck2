import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { buildBalanceCurve } from '#/components/bank-cards/balance-curve.util.ts';
import { AccountCard, AddAccountCard } from '#/components/bank-cards/index.ts';

const BASE = {
  theme: 'nubank',
  name: 'Nubank',
  subtitle: 'Conta corrente',
  badge: 'Open Finance',
  balanceCents: 341258,
  curve: [310000, 305000, 330000, 341258],
  curveLabel: 'Saldo do mês',
  onAction: () => {},
} as const;

describe('AccountCard', () => {
  it('shows the bank, the balance, the curve, the sync line and the action', () => {
    const html = renderToStaticMarkup(
      <AccountCard
        {...BASE}
        status="ok"
        statusLabel="Sincronizado há 12 min"
        actionLabel="Ajustar saldo"
      />,
    );
    expect(html).toContain('Nubank');
    expect(html).toContain('Conta corrente');
    expect(html).toContain('Open Finance');
    expect(html).toContain('3.412,58');
    expect(html).toContain('aria-label="Saldo do mês"');
    expect(html).toContain('Sincronizado há 12 min');
    expect(html).toContain('Ajustar saldo');
  });

  it('shows the failure in the warning color with the reason and the renew action', () => {
    const html = renderToStaticMarkup(
      <AccountCard
        {...BASE}
        theme="bradesco"
        name="Bradesco"
        status="failed"
        statusLabel="Falhou ontem às 18:40; o consentimento expira em 31/10"
        failureNote="Sem transações novas do Bradesco até renovar."
        actionLabel="Renovar"
      />,
    );
    expect(html).toContain('text-caution');
    expect(html).toContain('Falhou ontem');
    expect(html).toContain('Sem transações novas do Bradesco até renovar.');
    expect(html).toContain('Renovar');
  });

  it('draws the manual wallet with an icon, without a bank mark', () => {
    const html = renderToStaticMarkup(
      <AccountCard
        {...BASE}
        theme="wallet"
        name="Carteira"
        badge="Manual"
        status="ok"
        statusLabel="Saldo manual"
        actionLabel="Atualizar saldo"
      />,
    );
    expect(html).toContain('Carteira');
    expect(html).toContain('Manual');
    expect(html).toContain('bg-subtle');
  });

  it('keeps the height with a curve that has fewer than 2 points', () => {
    const html = renderToStaticMarkup(
      <AccountCard {...BASE} curve={[100]} status="ok" statusLabel="x" actionLabel="y" />,
    );
    expect(html).toContain('h-12');
    expect(html).not.toContain('stroke-brand');
  });
});

describe('AddAccountCard', () => {
  it('draws the dashed card with title and subtitle', () => {
    const html = renderToStaticMarkup(
      <AddAccountCard title="Conectar outra conta" subtitle="Banco do Brasil, Inter e outros 7" />,
    );
    expect(html).toContain('border-dashed');
    expect(html).toContain('Conectar outra conta');
    expect(html).toContain('Banco do Brasil, Inter e outros 7');
  });
});

describe('buildBalanceCurve', () => {
  it('maps the lowest value to the base and the highest to the top, and handles a flat month', () => {
    expect(buildBalanceCurve([0, 100])?.line).toBe(
      'M0.00 44.00 C50.00 44.00 50.00 4.00 100.00 4.00',
    );
    expect(buildBalanceCurve([5, 5, 5])?.line).toContain('M0.00 44.00');
    expect(buildBalanceCurve([])).toBeNull();
  });
});
