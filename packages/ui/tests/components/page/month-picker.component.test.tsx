import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MonthPicker } from '#/components/page/month-picker.component.tsx';

const noop = () => undefined;

function render(monthLabel: string, yearLabel = '2026') {
  return renderToStaticMarkup(
    <MonthPicker monthLabel={monthLabel} yearLabel={yearLabel} onPrevious={noop} onNext={noop} />,
  );
}

describe('MonthPicker', () => {
  it('has the two arrows named and a polite live region with the month', () => {
    const html = render('Outubro');

    expect(html).toContain('aria-label="Mês anterior"');
    expect(html).toContain('aria-label="Próximo mês"');
    expect(html).toMatch(/aria-live="polite"[^>]*>Outubro 2026</);
  });

  it('hides the animated text from screen readers, so the month is read once', () => {
    const html = render('Outubro');

    expect(html).toMatch(/<span aria-hidden="true" class="grid overflow-hidden[^"]*">/);
  });

  it('writes the month regular and small: 14 px on the phone, 15 px on the desktop', () => {
    const html = render('Outubro');

    expect(html).not.toMatch(/font-bold|font-emphasis|text-subsection|text-body/);
    expect(html).toContain('text-label');
    expect(html).toContain('lg:text-list');
  });

  it('paints month, year and arrows in the same secondary color', () => {
    const html = render('Outubro');

    expect(html).not.toContain('text-fg-primary');
    expect(html).toMatch(/class="grid overflow-hidden[^"]*text-fg-secondary/);
    expect(html.match(/<button[^>]*text-fg-secondary/g)?.length).toBe(2);
  });

  it('keeps the arrows still: the window is as wide as the widest month, whatever the month shown', () => {
    const widthSizer = (html: string) =>
      [...html.matchAll(/<span class="col-start-1 row-start-1 tabular-nums">([^<]*)</g)].map(
        (match) => match[1],
      );

    const shortMonth = widthSizer(render('Maio'));
    const longMonth = widthSizer(render('Setembro'));

    expect(shortMonth).toHaveLength(12);
    expect(shortMonth).toContain('Fevereiro 2026');
    expect(shortMonth).toEqual(longMonth);
  });

  it('clips the slide to the window between the arrows', () => {
    const html = render('Outubro');

    expect(html).toContain('overflow-hidden');
    expect(html).toMatch(/class="flex items-center gap-s4"/);
  });
});
