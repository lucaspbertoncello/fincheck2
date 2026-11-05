import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SubscriptionRow } from '#/features/recurrences/subscription-list/components/subscription-row.component.tsx';
import type { SubscriptionRowData } from '#/features/recurrences/subscription-list/types/subscription-list.type.ts';

const ROW: SubscriptionRowData = {
  recurrenceId: 's1',
  name: 'Streaming Plus',
  icon: 'wifi',
  detail: 'Roxinho · dia 12',
  status: 'charged',
  ended: false,
  amountCents: 3990,
  statusNote: 'Cobrada 05/11',
  alert: null,
  pending: false,
};

const noop = () => undefined;

describe('SubscriptionRow', () => {
  it('is the recurrence row: the state as the badge, the amount at the right end over its note', () => {
    const html = renderToStaticMarkup(<SubscriptionRow row={ROW} first onAction={noop} />);

    expect(html).toContain('>Cobrada<');
    expect(html).toContain('Roxinho · dia 12');
    expect(html).toContain('col-start-3 row-start-1');
    expect(html).toContain('39,90');
    expect(html).toContain('col-start-3 row-start-2');
    expect(html).toContain('Cobrada 05/11');
    expect(html).toContain('aria-label="Abrir Streaming Plus"');
    expect(html).toContain('aria-label="Ações de Streaming Plus"');
    // no warning: the strip is folded, with no content
    expect(html).toContain('grid-rows-[0fr]');
    expect(html).not.toContain('bg-caution-weak/45');
    expect(html.match(/<li/g)).toBeNull();
  });

  it('draws the divider only when it is not the first row', () => {
    expect(renderToStaticMarkup(<SubscriptionRow row={ROW} first onAction={noop} />)).not.toContain(
      'border-t',
    );
    expect(
      renderToStaticMarkup(<SubscriptionRow row={ROW} first={false} onAction={noop} />),
    ).toContain('border-t border-line');
  });

  it('puts the warning and its button on the strip, in the light caution tone', () => {
    const html = renderToStaticMarkup(
      <SubscriptionRow
        row={{
          ...ROW,
          alert: {
            kind: 'price_changed',
            text: 'Cobrou R$ 2,00 a mais.',
            actionLabel: 'Atualizar valor',
          },
        }}
        first
        onAction={noop}
      />,
    );

    expect(html).toContain('col-start-1 row-start-3');
    expect(html).toContain('lg:col-start-2');
    expect(html).toContain('grid-rows-[1fr]');
    expect(html).toContain('bg-caution-weak/45');
    // the button is under the sentence, never at the right end of the box
    expect(html.indexOf('Cobrou R$ 2,00 a mais.')).toBeLessThan(html.indexOf('Atualizar valor'));
    expect(html).toContain('flex-col items-start');
    expect(html).toContain('border-caution/20');
    expect(html).toContain('Cobrou R$ 2,00 a mais.');
    expect(html).toContain('Atualizar valor');
  });

  it('keeps at most two badges: the state and "Encerrada"', () => {
    const html = renderToStaticMarkup(
      <SubscriptionRow row={{ ...ROW, ended: true }} first onAction={noop} />,
    );

    expect(html).toContain('>Cobrada<');
    expect(html).toContain('Encerrada');
  });
});
