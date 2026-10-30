import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DayStripSection, formatDayTotal, type DayStripDay } from '#/components/day-strip/index.ts';
import { MoneyVisibilityContext } from '#/components/money/money-visibility.context.ts';

const noop = () => undefined;

const DAYS: DayStripDay<string>[] = [
  { date: '2026-10-22', totalCents: 0, items: [] },
  { date: '2026-10-25', totalCents: 409000, items: ['Pix da Ana'] },
  { date: '2026-10-27', totalCents: -12000, items: ['Aluguel do estudio'] },
  { date: '2026-10-28', totalCents: -128500, items: ['Seguro'] },
];

const MARKED: DayStripDay<string>[] = [
  { date: '2026-10-20', markers: [{ flow: 'expense', status: 'late' }], items: ['Faxina'] },
  { date: '2026-10-22', items: [] },
  {
    date: '2026-10-25',
    markers: [
      { flow: 'income', status: 'expected' },
      { flow: 'expense', status: 'partial' },
    ],
    items: ['Pix da Ana'],
  },
];

function projection(selectedDate: string, hidden = false) {
  return renderToStaticMarkup(
    <MoneyVisibilityContext value={hidden}>
      <DayStripSection
        title="Até o fim do mês"
        variant="projection"
        days={DAYS}
        today="2026-10-22"
        selectedDate={selectedDate}
        onSelectDate={noop}
        action={<a href="/bills">A pagar e receber</a>}
        renderDay={(day) => (
          <ul>
            {day.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        footer={<p>chips</p>}
      />
    </MoneyVisibilityContext>,
  );
}

describe('formatDayTotal', () => {
  it('writes whole reais with an explicit sign and no R$', () => {
    expect(formatDayTotal(409000)).toBe('+4.090');
    expect(formatDayTotal(-128500)).toBe('−1.285');
    expect(formatDayTotal(-5500)).toBe('−55');
    expect(formatDayTotal(0)).toBe('0');
  });
});

describe('DayStripSection, projection', () => {
  it('shows the section title, the header link and today as "hoje"', () => {
    const html = projection('2026-10-25');

    expect(html).toContain('Até o fim do mês');
    expect(html).toContain('A pagar e receber');
    expect(html).toContain('hoje');
    expect(html).toContain('>dom<');
  });

  it('colors the projected balance by sign and leaves a dot for empty days', () => {
    const html = projection('2026-10-25');

    expect(html).toContain('+4.090');
    expect(html).toContain('−1.285');
    expect(html).toContain('text-gain');
    expect(html).toContain('text-loss');
    expect(html).toContain('·');
  });

  it('marks the chosen day and lists its items with the date above', () => {
    const html = projection('2026-10-25');

    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('dom, 25 de outubro');
    expect(html).toContain('Pix da Ana');
    expect(html).not.toContain('Aluguel do estudio');
  });

  it('shows the empty message when the chosen day has nothing', () => {
    expect(projection('2026-10-22')).toContain('Nada neste dia');
  });

  it('names each day for screen readers, with the balance', () => {
    expect(projection('2026-10-25')).toContain('aria-label="dom, 25 de outubro, saldo +4.090"');
  });

  it('hides the balances with the eye on', () => {
    const html = projection('2026-10-25', true);

    expect(html).toContain('••••');
    expect(html).not.toContain('+4.090');
    expect(html).not.toContain('−1.285');
    expect(html).toContain('saldo valor oculto');
  });

  it('renders the footer slot and has no month arrows', () => {
    const html = projection('2026-10-25');

    expect(html).toContain('chips');
    expect(html).not.toContain('Dias anteriores');
  });
});

describe('DayStripSection, occurrences', () => {
  const html = renderToStaticMarkup(
    <DayStripSection
      title="Outubro, dia a dia"
      variant="occurrences"
      days={MARKED}
      today="2026-10-22"
      selectedDate="2026-10-25"
      onSelectDate={noop}
    />,
  );

  it('shows the legend and the scroll arrows', () => {
    expect(html).toContain('Aconteceu');
    expect(html).toContain('Parcial');
    expect(html).toContain('aria-label="Dias anteriores"');
    expect(html).toContain('aria-label="Próximos dias"');
  });

  it('fades past days and describes the markers of a day', () => {
    expect(html).toContain('opacity-45');
    expect(html).toContain('Receita esperado, Despesa parcial');
    expect(html).toContain('Despesa atrasado');
  });
});
