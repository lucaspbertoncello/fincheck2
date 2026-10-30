import {
  AccountSparkline,
  CategoryDonut,
  MonthSpendChart,
  VariationBadge,
  type DonutSlice,
} from '@fincheck/ui';

import {
  DONUT_SLICES,
  SPEND_CURRENT,
  SPEND_PREVIOUS,
} from '../../constants/sample-summary.constant.ts';
import { BALANCE_CURVE } from '../../constants/sample-bank.constant.ts';
import type { GallerySectionDef } from '../../types/gallery-group.type.ts';
import { GalleryVariant } from '../shell/gallery-variant.component.tsx';

const SPARK_POINTS = BALANCE_CURVE.map((cents, index) => ({ day: index + 1, cents }));

const BADGED_SLICES: DonutSlice[] = DONUT_SLICES.map((slice, index) =>
  index < 3 && !slice.isOther
    ? { ...slice, badge: <VariationBadge percent={[108, -4, 7][index] ?? 0} badTone="caution" /> }
    : slice,
);

export const CHARTS_SECTIONS: GallerySectionDef[] = [
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
  {
    id: 'account-sparkline',
    title: 'AccountSparkline',
    content: (
      <>
        <GalleryVariant caption="48 px (padrão)" width={320}>
          <AccountSparkline
            points={SPARK_POINTS}
            label="Saldo do Banco Aurora nos últimos 30 dias"
          />
        </GalleryVariant>
        <GalleryVariant caption="96 px" width={320}>
          <AccountSparkline
            points={SPARK_POINTS}
            label="Saldo do Banco Aurora nos últimos 30 dias"
            height={96}
          />
        </GalleryVariant>
        <GalleryVariant caption="poucos pontos" width={320}>
          <AccountSparkline points={SPARK_POINTS.slice(0, 3)} label="Saldo recente" />
        </GalleryVariant>
      </>
    ),
  },
];
