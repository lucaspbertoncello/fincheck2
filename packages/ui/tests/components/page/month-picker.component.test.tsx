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

  describe('with the period button (Transações)', () => {
    const OPTIONS = [
      { key: 'month', label: 'Mês' },
      { key: '12m', label: '12 meses' },
      { key: 'year', label: 'Este ano' },
      { key: 'all', label: 'Tudo' },
    ];

    function renderWithPeriod(value: string, rangeLabel: string | null) {
      return renderToStaticMarkup(
        <MonthPicker
          monthLabel="Outubro"
          yearLabel="2026"
          onPrevious={noop}
          onNext={noop}
          period={{ options: OPTIONS, value, onChange: noop, monthKey: 'month', rangeLabel }}
        />,
      );
    }

    it('has no period button without the prop', () => {
      expect(render('Outubro')).not.toContain('Período');
    });

    it('adds the period button, named by the chosen option, inside the same group', () => {
      const html = renderWithPeriod('month', null);

      expect(html).toContain('role="group" aria-label="Mês"');
      expect(html).toContain('aria-label="Período: Mês"');
      expect(html).toContain('aria-haspopup="true"');
      expect(html).toContain('aria-expanded="false"');
    });

    it('keeps the button as wide as the longest option, whatever is chosen', () => {
      const sizers = (html: string) =>
        [...html.matchAll(/<span class="invisible col-start-1 row-start-1">([^<]*)</g)].map(
          (match) => match[1],
        );

      expect(sizers(renderWithPeriod('month', null))).toEqual([
        'Mês',
        '12 meses',
        'Este ano',
        'Tudo',
      ]);
      expect(sizers(renderWithPeriod('all', 'Tudo'))).toEqual([
        'Mês',
        '12 meses',
        'Este ano',
        'Tudo',
      ]);
    });

    it('lights the button out of the month, and only then', () => {
      const lit = /<button class="[^"]*bg-brand-weak text-brand"[^>]*aria-label="Período/;

      expect(renderWithPeriod('month', null)).not.toMatch(lit);
      expect(renderWithPeriod('month', null)).toMatch(
        /<button class="[^"]*bg-subtle[^"]*"[^>]*aria-label="Período: Mês"/,
      );
      expect(renderWithPeriod('12m', 'dez 2025 – nov 2026')).toMatch(lit);
    });

    it('shows the range in the month place, same window, arrows hidden but still in place', () => {
      const month = renderWithPeriod('month', null);
      const range = renderWithPeriod('12m', 'dez 2025 – nov 2026');
      const sizerOf = (html: string) =>
        [...html.matchAll(/<span class="col-start-1 row-start-1 tabular-nums">([^<]*)</g)].map(
          (match) => match[1],
        );

      expect(range).toMatch(/aria-live="polite"[^>]*>dez 2025 – nov 2026</);
      expect(sizerOf(range)).toEqual(sizerOf(month));
      expect(sizerOf(month)).toHaveLength(13);
      expect(sizerOf(month)).toContain('mmm 0000 – mmm 0000');
      expect(range.match(/<button class="[^"]* invisible"/g)).toHaveLength(2);
      expect(month).not.toMatch(/<button class="[^"]* invisible"/);
    });
  });
});
