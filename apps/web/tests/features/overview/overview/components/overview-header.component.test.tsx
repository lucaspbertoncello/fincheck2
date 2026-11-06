import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { OverviewAlerts } from '#/features/overview/overview/components/overview-alerts.component.tsx';
import { OverviewHeaderExtra } from '#/features/overview/overview/components/overview-header-extra.component.tsx';

const DATA = { daysLeft: 25, incomeCents: 710000, expenseCents: 449531 };

describe('OverviewHeaderExtra', () => {
  it('shows the remaining strip and no stale-data notice', () => {
    const html = renderToStaticMarkup(
      <OverviewHeaderExtra remaining={{ isVisible: true, data: DATA }} />,
    );

    expect(html).toContain('Faltam');
    expect(html).toContain('7.100,00');
    expect(html).toContain('4.495,31');
    expect(html).not.toContain('parado');
    expect(html).not.toContain('>ver<');
  });

  it('draws nothing when the month has no remaining figures', () => {
    expect(
      renderToStaticMarkup(
        <OverviewHeaderExtra remaining={{ isVisible: false, data: undefined }} />,
      ),
    ).toBe('');
  });
});

describe('OverviewAlerts', () => {
  it('draws each alert as a notice with a real "Ver" link', () => {
    const html = renderToStaticMarkup(
      <OverviewAlerts
        alerts={[{ key: 'a', message: 'Conexão com erro no Nubank', href: '/settings' }]}
      />,
    );

    expect(html).toContain('Conexão com erro no Nubank');
    expect(html).toContain('href="/settings"');
    expect(html).toContain('>Ver<');
    expect(html).not.toContain('·');
  });

  it('draws nothing without alerts', () => {
    expect(renderToStaticMarkup(<OverviewAlerts alerts={[]} />)).toBe('');
  });
});
