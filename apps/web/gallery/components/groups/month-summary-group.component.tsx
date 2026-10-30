import {
  ExpenseSummaryCard,
  IncomeSummaryCard,
  Money,
  MonthSummaryCard,
  MonthSummaryCards,
  ResultSummaryCard,
  SummaryBar,
  VariationBadge,
} from '@fincheck/ui';

import type { GallerySectionDef } from '../../types/gallery-group.type.ts';
import { GalleryVariant } from '../shell/gallery-variant.component.tsx';

const TONES = ['brand', 'gain', 'muted', 'strong', 'loss'] as const;

export const MONTH_SUMMARY_SECTIONS: GallerySectionDef[] = [
  {
    id: 'month-summary-cards',
    title: 'MonthSummaryCards',
    content: (
      <>
        <GalleryVariant caption="resultado positivo" width={1040}>
          <MonthSummaryCards>
            <IncomeSummaryCard
              receivedCents={450000}
              expectedCents={870000}
              pendingNote="Vale Verde ainda vem"
            />
            <ExpenseSummaryCard
              spentCents={318000}
              previousSamePointCents={290000}
              previousTotalCents={520000}
              previousMonthLabel="setembro"
            />
            <ResultSummaryCard
              receivedCents={450000}
              spentCents={318000}
              previousResultCents={60000}
              previousMonthLabel="setembro"
            />
          </MonthSummaryCards>
        </GalleryVariant>
        <GalleryVariant caption="resultado negativo, despesa em queda, tudo recebido" width={1040}>
          <MonthSummaryCards>
            <IncomeSummaryCard receivedCents={870000} expectedCents={870000} />
            <ExpenseSummaryCard
              spentCents={910000}
              previousSamePointCents={1200000}
              previousTotalCents={1300000}
              previousMonthLabel="setembro"
            />
            <ResultSummaryCard
              receivedCents={870000}
              spentCents={910000}
              previousResultCents={-20000}
              previousMonthLabel="setembro"
            />
          </MonthSummaryCards>
        </GalleryVariant>
        <GalleryVariant caption="zerado (início do mês)" width={1040}>
          <MonthSummaryCards>
            <IncomeSummaryCard receivedCents={0} expectedCents={870000} />
            <ExpenseSummaryCard
              spentCents={0}
              previousSamePointCents={0}
              previousTotalCents={520000}
              previousMonthLabel="setembro"
            />
            <ResultSummaryCard
              receivedCents={0}
              spentCents={0}
              previousResultCents={0}
              previousMonthLabel="setembro"
            />
          </MonthSummaryCards>
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'summary-card-frame',
    title: 'MonthSummaryCard (moldura) e SummaryBar',
    content: (
      <>
        <GalleryVariant caption="moldura montada à mão" width={320}>
          <MonthSummaryCard
            icon="trend"
            label="Exemplo"
            badge={<VariationBadge percent={12} />}
            value={<Money cents={123456} className="text-money-md" />}
            subtext="Duas linhas de texto de apoio para conferir a altura."
            bar={
              <SummaryBar
                label="Exemplo: 60%"
                segments={[
                  { percent: 40, tone: 'brand' },
                  { percent: 20, tone: 'muted' },
                ]}
              />
            }
            barLegend="Legenda da barra"
          />
        </GalleryVariant>
        {TONES.map((tone) => (
          <GalleryVariant key={tone} caption={`SummaryBar ${tone}`} width={240}>
            <SummaryBar label={`Barra ${tone}`} segments={[{ percent: 55, tone }]} />
          </GalleryVariant>
        ))}
        <GalleryVariant caption="SummaryBar com 3 trechos" width={240}>
          <SummaryBar
            label="Três trechos"
            segments={[
              { percent: 30, tone: 'gain' },
              { percent: 30, tone: 'strong' },
              { percent: 20, tone: 'loss' },
            ]}
          />
        </GalleryVariant>
      </>
    ),
  },
];
