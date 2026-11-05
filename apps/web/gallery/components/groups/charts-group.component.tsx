import {
  CategoryDonut,
  MonthSpendChart,
  SpendHeatmap,
  SpendHeatmapLegend,
  VariationBadge,
  type DonutSlice,
} from '@fincheck/ui';

import {
  DONUT_SLICES,
  SPEND_CURRENT,
  SPEND_PREVIOUS,
} from '#gallery/constants/sample-summary.constant.ts';
import { SAMPLE_HEATMAP_DAYS } from '#gallery/constants/sample-heatmap.constant.ts';
import type { GallerySectionDef } from '#gallery/types/gallery-group.type.ts';
import { GalleryVariant } from '#gallery/components/shell/gallery-variant.component.tsx';

const BADGED_SLICES: DonutSlice[] = DONUT_SLICES.map((slice, index) =>
  index < 3 && !slice.isOther
    ? { ...slice, badge: <VariationBadge percent={[108, -4, 7][index] ?? 0} badTone="caution" /> }
    : slice,
);

export const CHARTS_SECTIONS: GallerySectionDef[] = [
  {
    id: 'spend-heatmap',
    title: 'SpendHeatmap',
    content: (
      <>
        <GalleryVariant
          caption="12 meses, tamanho do desktop (passe o mouse ou use as setas)"
          width={820}
        >
          <SpendHeatmap
            days={SAMPLE_HEATMAP_DAYS}
            label="Gasto por dia nos últimos 12 meses"
            onSelectDay={() => undefined}
          />
          <SpendHeatmapLegend className="mt-s12 justify-end" />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'month-spend-chart',
    title: 'MonthSpendChart',
    content: (
      <>
        <GalleryVariant caption="mês corrente até hoje (dia 22) contra o anterior" width={760}>
          <MonthSpendChart
            currentLabel="Outubro"
            previousLabel="Setembro"
            current={SPEND_CURRENT}
            previous={SPEND_PREVIOUS}
            today={22}
            daysInMonth={31}
          />
        </GalleryVariant>
        <GalleryVariant caption="título próprio, mais baixo" width={480}>
          <MonthSpendChart
            title="Quanto saiu"
            currentLabel="Outubro"
            previousLabel="Setembro"
            current={SPEND_CURRENT.slice(0, 8)}
            previous={SPEND_PREVIOUS}
            today={8}
            daysInMonth={31}
            height={160}
          />
        </GalleryVariant>
        <GalleryVariant caption="sem dado (início do mês)" width={480}>
          <MonthSpendChart
            currentLabel="Outubro"
            previousLabel="Setembro"
            current={[]}
            previous={SPEND_PREVIOUS}
            today={1}
            daysInMonth={31}
          />
        </GalleryVariant>
      </>
    ),
  },
  {
    id: 'category-donut',
    title: 'CategoryDonut',
    content: (
      <>
        <GalleryVariant caption="com selos de variação e detalhe" width={560}>
          <CategoryDonut
            slices={BADGED_SLICES}
            centerLabel="Gasto"
            centerTitle="Delivery"
            centerDetail="+108% que set."
          />
        </GalleryVariant>
        <GalleryVariant caption="sem detalhe, com aside" width={560}>
          <CategoryDonut
            slices={DONUT_SLICES.slice(0, 3)}
            centerLabel="Gasto"
            centerTitle="Mercado"
            aside={<p className="text-label text-fg-secondary">Onde mais cresceu: Delivery</p>}
          />
        </GalleryVariant>
        <GalleryVariant caption="uma categoria só" width={560}>
          <CategoryDonut
            slices={DONUT_SLICES.slice(0, 1)}
            centerLabel="Gasto"
            centerTitle="Delivery"
          />
        </GalleryVariant>
      </>
    ),
  },
];
