import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { dayRangeLabel } from '#/components/day-strip/day-range-label.util.ts';
import { shiftBusinessDate } from '#/components/day-strip/shift-business-date.util.ts';
import { weekStartOf } from '#/components/day-strip/week-start-of.util.ts';
import { DayStripSection, formatDayTotal, type DayStripDay } from '#/components/day-strip/index.ts';
import { groupDaysByWeek } from '#/components/day-strip/group-days-by-week.util.ts';
import { MoneyVisibilityContext } from '#/components/money/money-visibility.context.ts';

const noop = () => undefined;

const DAYS: DayStripDay<string>[] = [
  { date: '2026-10-22', totalCents: 0, items: [] },
  {
    date: '2026-10-25',
    totalCents: 409000,
    inCents: 420000,
    outCents: 11000,
    items: ['Pix da Ana'],
  },
  { date: '2026-10-27', totalCents: -12000, outCents: 421000, items: ['Aluguel do estudio'] },
  { date: '2026-10-28', totalCents: -128500, outCents: 116500, items: ['Seguro'] },
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

function projection(selectedDate: string, hidden = false, mode: 'day' | 'week' = 'day') {
  return renderToStaticMarkup(
    <MoneyVisibilityContext value={hidden}>
      <DayStripSection
        title="Até o fim do mês"
        variant="projection"
        mode={mode}
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

describe('groupDaysByWeek', () => {
  it('groups by week from Sunday, keeps the first partial week and sums in, out and items', () => {
    const weeks = groupDaysByWeek(DAYS, '2026-10-22');

    expect(weeks.map((week) => [week.startDate, week.endDate])).toEqual([
      ['2026-10-22', '2026-10-22'],
      ['2026-10-25', '2026-10-28'],
    ]);
    expect(weeks[1]).toMatchObject({
      inCents: 420000,
      outCents: 548500,
      endBalanceCents: -128500,
      isCurrent: false,
      items: ['Pix da Ana', 'Aluguel do estudio', 'Seguro'],
    });
    expect(weeks[0]?.isCurrent).toBe(true);
  });

  it('has no current week when today is not among the days', () => {
    expect(groupDaysByWeek(DAYS, '2026-11-02').some((week) => week.isCurrent)).toBe(false);
  });
});

describe('day dates', () => {
  it('moves a date across the end of the month without a time zone', () => {
    expect(shiftBusinessDate('2026-10-31', 1)).toBe('2026-11-01');
    expect(weekStartOf('2026-10-28')).toBe('2026-10-25');
  });

  it('writes the range of a week in words', () => {
    expect(dayRangeLabel('2026-10-25', '2026-10-31')).toBe('25 a 31 de outubro');
    expect(dayRangeLabel('2026-10-31', '2026-10-31')).toBe('31 de outubro');
    expect(dayRangeLabel('2026-10-29', '2026-11-04')).toBe('29 de outubro a 4 de novembro');
  });
});

describe('DayStripSection, projection, Dia view', () => {
  it('shows the title, the header link and the Dia | Semana selector', () => {
    const html = projection('2026-10-25');

    expect(html).toContain('Até o fim do mês');
    expect(html).toContain('A pagar e receber');
    expect(html).toContain('>Dia<');
    expect(html).toContain('>Semana<');
  });

  it('stacks Entra, Sai and the balance as label/value lines in a narrow box, three columns in a wide one', () => {
    const html = projection('2026-10-25');

    expect(html).toContain('@container');
    expect(html).toContain('grid-cols-1');
    expect(html).toContain('@min-[30rem]:grid-cols-3');
    expect(html).toContain('whitespace-nowrap');
  });

  it('shows one day at a time, never the whole list of days', () => {
    const html = projection('2026-10-25');

    expect(html).not.toContain('role="listbox"');
    expect(html).not.toContain('Aluguel do estudio');
    expect(html).toContain('dom, 25 de outubro');
    expect(html).toContain('Dia 2 de 4');
  });

  it('shows what comes in, what goes out and the projected balance of the day', () => {
    const html = projection('2026-10-25');

    expect(html).toContain('Entra');
    expect(html).toContain('Sai');
    expect(html).toContain('Saldo projetado');
    expect(html).toContain('4.200,00');
    expect(html).toContain('110,00');
    expect(html).toContain('4.090,00');
  });

  it('marks the balance of a negative day in red', () => {
    expect(projection('2026-10-28')).toContain('text-loss');
  });

  it('calls today "hoje" and names the arrows', () => {
    const html = projection('2026-10-22');

    expect(html).toContain('>hoje<');
    expect(html).toContain('aria-label="Dia anterior"');
    expect(html).toContain('aria-label="Próximo dia"');
  });

  it('lists the items of the chosen day with the empty message when there are none', () => {
    expect(projection('2026-10-25')).toContain('Pix da Ana');
    expect(projection('2026-10-22')).toContain('Nada neste dia');
  });

  it('hides the amounts with the eye on and tells screen readers', () => {
    const html = projection('2026-10-25', true);

    expect(html).toContain('••••');
    expect(html).not.toContain('4.090,00');
    expect(html).toContain('entra valor oculto');
  });

  it('renders the footer slot and has no month arrows', () => {
    const html = projection('2026-10-25');

    expect(html).toContain('chips');
    expect(html).not.toContain('Dias anteriores');
  });
});

describe('DayStripSection, projection, Semana view', () => {
  const html = projection('2026-10-25', false, 'week');

  it('shows a card per week with the range, in, out and the balance at the end', () => {
    expect(html).toContain('22 de outubro');
    expect(html).toContain('25 a 28 de outubro');
    expect(html).toContain('Saldo ao fim');
    expect(html).toContain('5.485,00');
  });

  it('makes the balance the main number and colors in and out with their signs', () => {
    expect(html).toContain('Saldo ao fim');
    expect(html).toContain('text-money-md');
    expect(html).toContain('text-gain');
    expect(html).toContain('+');
    expect(html).toContain('text-loss');
    expect(html).toContain('−');
  });

  it('shows a zero flow as a discreet dash, not as R$ 0,00', () => {
    const [first] = html.split('<li').slice(1);

    // Both flows of the first week are zero (the balance of 0,00 is the main number, not a flow).
    expect(first?.match(/aria-hidden="true">—</g)).toHaveLength(2);
    expect(first).not.toContain('+');
  });

  it('fills the row with equal cards that scroll sideways instead of leaving a hole', () => {
    expect(html).toContain('grid-flow-col');
    expect(html).toContain('auto-cols-[minmax(15rem,1fr)]');
    expect(html).toContain('overflow-x-auto');
    expect(html).not.toContain('lg:grid-cols-3');
  });

  it('marks the week that holds today with a tinted surface and the label, and leaves the day list out', () => {
    expect(html).toContain('Esta semana');
    expect(html).toContain('border-brand bg-brand-weak');
    expect(html).not.toContain('Nada neste dia');
    expect(html).not.toContain('Pix da Ana');
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
