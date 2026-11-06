import {
  ExpenseSummaryCard,
  IncomeSummaryCard,
  MetricCard,
  Money,
  MonthSummaryCard,
  MonthSummaryCards,
  ResultSummaryCard,
  SummaryBar,
  VariationBadge,
} from '@fincheck/ui';

import { buildExpenseBar } from '#/domain/dashboard/month-summary/rules/build-expense-bar.rule.ts';
import { buildIncomeBar } from '#/domain/dashboard/month-summary/rules/build-income-bar.rule.ts';
import { buildResultBar } from '#/domain/dashboard/month-summary/rules/build-result-bar.rule.ts';
import { getReceivedPercent } from '#/domain/dashboard/month-summary/rules/get-received-percent.rule.ts';
import { getSpentVariationPercent } from '#/domain/dashboard/month-summary/rules/get-spent-variation-percent.rule.ts';
import type { GallerySectionDef } from '#gallery/types/gallery-group.type.ts';
import { GalleryVariant } from '#gallery/components/shell/gallery-variant.component.tsx';

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
              percent={getReceivedPercent(450000, 870000)}
              barSegments={buildIncomeBar(450000, 870000)}
              pendingNote="Vale Verde ainda vem"
            />
            <ExpenseSummaryCard
              spentCents={318000}
              previousSamePointCents={290000}
              barSegments={buildExpenseBar(318000, 520000)}
              variationPercent={getSpentVariationPercent(318000, 290000)}
              previousMonthLabel="setembro"
            />
            <ResultSummaryCard
              receivedCents={450000}
              spentCents={318000}
              previousResultCents={60000}
              barSegments={buildResultBar(450000, 318000)}
              previousMonthLabel="setembro"
            />
          </MonthSummaryCards>
        </GalleryVariant>
        <GalleryVariant
          caption="cartões clicáveis (href): hover sutil, foco no cartão inteiro"
          width={1040}
        >
          <MonthSummaryCards>
            <IncomeSummaryCard
              receivedCents={450000}
              expectedCents={870000}
              percent={getReceivedPercent(450000, 870000)}
              barSegments={buildIncomeBar(450000, 870000)}
              pendingNote="Vale Verde ainda vem"
              href="#recorrentes"
            />
            <ExpenseSummaryCard
              spentCents={318000}
              previousSamePointCents={290000}
              barSegments={buildExpenseBar(318000, 520000)}
              variationPercent={getSpentVariationPercent(318000, 290000)}
              previousMonthLabel="setembro"
              href="#transacoes"
            />
            <ResultSummaryCard
              receivedCents={450000}
              spentCents={318000}
              previousResultCents={60000}
              barSegments={buildResultBar(450000, 318000)}
              previousMonthLabel="setembro"
              href="#transacoes"
            />
          </MonthSummaryCards>
        </GalleryVariant>
        <GalleryVariant caption="resultado negativo, despesa em queda, tudo recebido" width={1040}>
          <MonthSummaryCards>
            <IncomeSummaryCard
              receivedCents={870000}
              expectedCents={870000}
              percent={getReceivedPercent(870000, 870000)}
              barSegments={buildIncomeBar(870000, 870000)}
            />
            <ExpenseSummaryCard
              spentCents={910000}
              previousSamePointCents={1200000}
              barSegments={buildExpenseBar(910000, 1300000)}
              variationPercent={getSpentVariationPercent(910000, 1200000)}
              previousMonthLabel="setembro"
            />
            <ResultSummaryCard
              receivedCents={870000}
              spentCents={910000}
              previousResultCents={-20000}
              barSegments={buildResultBar(870000, 910000)}
              previousMonthLabel="setembro"
            />
          </MonthSummaryCards>
        </GalleryVariant>
        <GalleryVariant caption="zerado (início do mês)" width={1040}>
          <MonthSummaryCards>
            <IncomeSummaryCard
              receivedCents={0}
              expectedCents={870000}
              percent={getReceivedPercent(0, 870000)}
              barSegments={buildIncomeBar(0, 870000)}
            />
            <ExpenseSummaryCard
              spentCents={0}
              previousSamePointCents={0}
              barSegments={buildExpenseBar(0, 520000)}
              variationPercent={getSpentVariationPercent(0, 0)}
              previousMonthLabel="setembro"
            />
            <ResultSummaryCard
              receivedCents={0}
              spentCents={0}
              previousResultCents={0}
              barSegments={buildResultBar(0, 0)}
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
        <GalleryVariant caption="MetricCard (curiosidades do Perfil, sem barra)" width={260}>
          <MetricCard
            icon="trend"
            label="Maior Pix"
            value={<Money cents={123456} sign="none" tone="expense" />}
            lines={
              <>
                <span className="truncate whitespace-nowrap">para Rafael</span>
                <span className="truncate whitespace-nowrap">12 mar</span>
              </>
            }
          />
        </GalleryVariant>
        <GalleryVariant caption="MetricCard sem dado" width={260}>
          <MetricCard icon="trend" label="Maior Pix" value={null} />
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
