import type { Timeline } from '@fincheck/shared/dashboard/timeline/timeline.type.ts';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DayItems } from '#/features/overview/overview/components/day-items.component.tsx';

const ITEMS: Timeline.Item[] = [
  {
    key: 'a',
    source: {
      type: 'occurrence',
      billId: null,
      occurrenceId: 'o1',
      recurrenceId: null,
      accountId: null,
      month: null,
    },
    flow: 'in',
    title: 'Salário Alvorada, 5º dia útil, com um nome bem comprido para truncar',
    amountCents: 520000,
    state: 'expected',
    date: '2026-11-05',
  },
  {
    key: 'b',
    source: {
      type: 'bill',
      billId: 'b1',
      occurrenceId: null,
      recurrenceId: null,
      accountId: null,
      month: null,
    },
    flow: 'out',
    title: 'Internet',
    amountCents: 12990,
    state: 'late',
    date: '2026-11-05',
  },
];

describe('DayItems', () => {
  it('uses the standard list row: name on one line, state as a truncated detail, amount with the sign column', () => {
    const html = renderToStaticMarkup(<DayItems items={ITEMS} />);

    expect(html).toContain('grid-cols-[auto_minmax(0,1fr)_auto_auto]');
    expect(html).toContain('truncate');
    expect(html).toContain(
      'title="Salário Alvorada, 5º dia útil, com um nome bem comprido para truncar"',
    );
    expect(html).toContain('title="Esperado"');
    expect(html).toContain('title="Atrasado"');
    expect(html).toContain('w-sign-col');
    expect(html).toContain('text-body font-emphasis');
  });

  it('lets the list draw the dividers instead of a border on each row', () => {
    const html = renderToStaticMarkup(<DayItems items={ITEMS} />);

    expect(html).toContain('divide-y divide-line');
    expect(html).not.toContain('border-t');
  });
});
