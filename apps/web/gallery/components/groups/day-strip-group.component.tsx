import {
  Chip,
  DayStrip,
  DayStripLegend,
  DayStripSection,
  Money,
  formatDayTotal,
  type DayStripDay,
} from '@fincheck/ui';

import {
  MONTH_DAYS,
  PROJECTION_DAYS,
  TODAY,
  type DayItem,
} from '#gallery/constants/sample-planning.constant.ts';
import type { GallerySectionDef } from '#gallery/types/gallery-group.type.ts';
import { GalleryVariant } from '#gallery/components/shell/gallery-variant.component.tsx';
import { State } from '#gallery/components/shell/state.component.tsx';

function renderDay(day: DayStripDay<DayItem>) {
  return (
    <ul className="m-0 flex list-none flex-col gap-s8 p-0">
      {day.items.map((item) => (
        <li key={item.id} className="flex justify-between text-body text-fg-primary">
          <span>{item.name}</span>
          <Money cents={item.cents} />
        </li>
      ))}
    </ul>
  );
}

export const DAY_STRIP_SECTIONS: GallerySectionDef[] = [
  {
    id: 'day-strip-section-projection',
    title: 'DayStripSection: projection ("Até o fim do mês")',
    content: (
      <State initial="2026-10-28">
        {(selected, set) => (
          <GalleryVariant
            caption="Dia | Semana: slider de dias (setas, teclado, pontos) ou as semanas que faltam; detalhe do dia embaixo"
            width={1040}
          >
            <DayStripSection
              title="Até o fim do mês"
              variant="projection"
              days={PROJECTION_DAYS}
              today={TODAY}
              selectedDate={selected}
              onSelectDate={set}
              renderDay={renderDay}
              emptyDayLabel="Nada previsto para este dia."
              action={<span className="text-label text-brand">A pagar e receber</span>}
              footer={
                <div className="flex gap-s8">
                  <Chip tone="warn">2 atrasados</Chip>
                  <Chip>1 sem data</Chip>
                </div>
              }
            />
          </GalleryVariant>
        )}
      </State>
    ),
  },
  {
    id: 'day-strip-section-occurrences',
    title: 'DayStripSection: occurrences ("dia a dia")',
    content: (
      <State initial="2026-10-15">
        {(selected, set) => (
          <GalleryVariant caption="mês inteiro, marcadores, legenda, rolagem lateral" width={1040}>
            <DayStripSection
              title="Outubro, dia a dia"
              variant="occurrences"
              days={MONTH_DAYS}
              today={TODAY}
              selectedDate={selected}
              onSelectDate={set}
              renderDay={renderDay}
              emptyDayLabel="Nada previsto para este dia."
            />
          </GalleryVariant>
        )}
      </State>
    ),
  },
  {
    id: 'day-strip',
    title: 'DayStrip e DayStripLegend (soltos)',
    content: (
      <>
        <State initial="2026-10-25">
          {(selected, set) => (
            <GalleryVariant caption="DayStrip projection" width={1040}>
              <DayStrip
                days={PROJECTION_DAYS}
                today={TODAY}
                selectedDate={selected}
                onSelectDate={set}
                variant="projection"
                label="Até o fim do mês"
              />
            </GalleryVariant>
          )}
        </State>
        <State initial="2026-10-28">
          {(selected, set) => (
            <GalleryVariant caption="DayStrip occurrences" width={1040}>
              <DayStrip
                days={MONTH_DAYS}
                today={TODAY}
                selectedDate={selected}
                onSelectDate={set}
                variant="occurrences"
                label="Outubro, dia a dia"
              />
            </GalleryVariant>
          )}
        </State>
        <GalleryVariant caption="DayStripLegend">
          <DayStripLegend />
        </GalleryVariant>
        <GalleryVariant caption="formatDayTotal">
          <p className="text-meta text-fg-secondary">
            {formatDayTotal(250000)} · {formatDayTotal(-1234500)} · {formatDayTotal(0)}
          </p>
        </GalleryVariant>
      </>
    ),
  },
];
