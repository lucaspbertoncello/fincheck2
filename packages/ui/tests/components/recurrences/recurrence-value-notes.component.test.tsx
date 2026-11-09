import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MoneyVisibilityContext } from '#/components/money/index.ts';
import { RecurrenceValueNotes } from '#/components/recurrences/recurrence-value-notes.component.tsx';

describe('RecurrenceValueNotes', () => {
  it('writes the expected amount, what is missing and the excess, each as a part', () => {
    const html = renderToStaticMarkup(
      <RecurrenceValueNotes
        layout="inline"
        expectedCents={85000}
        remainingCents={42500}
        excessCents={1000}
      />,
    );

    expect(html).toContain('≈');
    expect(html).toContain('850,00');
    expect(html).toContain('previstos');
    expect(html).toContain('faltam');
    expect(html).toContain('425,00');
    expect(html).toContain('10,00');
    expect(html).toContain('a mais');
  });

  it('breaks only between the parts on the strip, and one per line in the column', () => {
    const inline = renderToStaticMarkup(<RecurrenceValueNotes layout="inline" expectedCents={1} />);
    const column = renderToStaticMarkup(<RecurrenceValueNotes layout="column" expectedCents={1} />);

    expect(inline).toContain('flex-wrap');
    expect(inline).toContain('whitespace-nowrap');
    expect(column).toContain('flex-col items-end');
  });

  it('only says "previsto" while the main value is the expected one', () => {
    const html = renderToStaticMarkup(<RecurrenceValueNotes layout="column" forecast />);

    expect(html).toContain('previsto');
    expect(html).not.toContain('previstos');
    expect(html).not.toContain('≈');
  });

  it('hides the amounts when the eye is on', () => {
    const html = renderToStaticMarkup(
      <MoneyVisibilityContext value>
        <RecurrenceValueNotes layout="inline" expectedCents={85000} remainingCents={42500} />
      </MoneyVisibilityContext>,
    );

    expect(html).not.toContain('850,00');
    expect(html).not.toContain('425,00');
  });
});
