import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { IncomeSourceRow } from '#/features/profile/profile/components/income-source-row.component.tsx';

const SOURCE: Profile.IncomeSource = {
  recurrenceId: 'r1',
  name: 'Salário Alvorada',
  counterparty: 'Alvorada Tecnologia',
  employmentRegime: 'clt',
  expectedAmountCents: 850000,
  amountMode: 'last_received',
  dateRule: {
    type: 'fixed_day',
    day: 5,
    businessDayNumber: null,
    toleranceDays: null,
    nonBusinessDayShift: 'none',
  },
  accountId: null,
  nextExpectedOn: null,
};

const noop = () => undefined;

describe('IncomeSourceRow', () => {
  it('is a standard row: icon first, the amount at the right end, the detail on the full width', () => {
    const html = renderToStaticMarkup(<IncomeSourceRow source={SOURCE} onEdit={noop} />);

    expect(html.startsWith('<li ')).toBe(true);
    expect(html).toContain('col-start-1 row-start-1');
    expect(html).toContain('col-start-3 row-start-1');
    expect(html).toContain('8.500,00');
    expect(html).toContain('igual ao último recebido');
    // no note under the amount: the detail runs under it up to the edge, two lines on the phone
    expect(html).not.toContain('col-start-3 row-start-2');
    expect(html).toMatch(/<p[^>]*line-clamp-2[^>]*lg:line-clamp-1[^>]*-col-end-1/);
    expect(html).toContain('Alvorada Tecnologia');
  });

  it('has no "Editar" button beside the amount: the name and the menu edit', () => {
    const html = renderToStaticMarkup(<IncomeSourceRow source={SOURCE} onEdit={noop} />);

    expect(html).not.toContain('>Editar<');
    expect(html).toContain('aria-label="Editar Salário Alvorada"');
    expect(html).toContain('aria-label="Ações de Salário Alvorada"');
  });

  it('has no reference under a fixed amount', () => {
    const html = renderToStaticMarkup(
      <IncomeSourceRow source={{ ...SOURCE, amountMode: 'fixed' }} onEdit={noop} />,
    );

    expect(html).not.toContain('igual ao último recebido');
  });
});
