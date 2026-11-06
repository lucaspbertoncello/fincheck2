import { Chip, type DayStripMode, DayStripSection, LinkButton, Money } from '@fincheck/ui';

import { DayItems } from '#/features/overview/overview/components/day-items.component.tsx';
import type { StripData } from '#/features/overview/overview/overview.model.ts';

type DayStripBlockProps = {
  data: StripData;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  mode: DayStripMode;
  onModeChange: (mode: DayStripMode) => void;
  billsHref: string;
};

/** "Até o fim do mês": the Dia | Semana selector (BR-DSH-014), the day slider or the week cards, the chosen day and the late/undated chips. */
export function DayStripBlock({
  data,
  selectedDate,
  onSelectDate,
  mode,
  onModeChange,
  billsHref,
}: DayStripBlockProps) {
  const hasChips = data.overdue.length > 0 || data.undated.length > 0;

  return (
    <DayStripSection
      title="Até o fim do mês"
      variant="projection"
      // On the desktop it sits right under the summary cards, which are boxes now: no rule between.
      className="lg:border-t-0"
      mode={mode}
      onModeChange={onModeChange}
      days={data.days}
      today={data.today}
      selectedDate={selectedDate}
      onSelectDate={onSelectDate}
      action={<LinkButton href={billsHref}>A pagar e receber</LinkButton>}
      renderDay={(day) => <DayItems items={day.items} />}
      emptyDayLabel="Nada previsto para este dia."
      footer={
        hasChips ? (
          <ul className="m-0 flex list-none flex-wrap gap-s8 p-0">
            {data.overdue.map((item) => (
              <li key={item.key}>
                <Chip tone="warn" icon="warning">
                  Atrasado: {item.title},{' '}
                  <Money
                    cents={item.amountCents}
                    sign={item.flow === 'in' ? 'plus' : 'minus'}
                    tone={item.flow === 'in' ? 'income' : 'expense'}
                    weight="plain"
                  />
                </Chip>
              </li>
            ))}
            {data.undated.map((item) => (
              <li key={item.key}>
                <Chip>
                  Sem data: {item.title},{' '}
                  <Money
                    cents={item.amountCents}
                    sign={item.flow === 'in' ? 'plus' : 'minus'}
                    tone={item.flow === 'in' ? 'income' : 'expense'}
                    weight="plain"
                  />
                </Chip>
              </li>
            ))}
          </ul>
        ) : undefined
      }
    />
  );
}
