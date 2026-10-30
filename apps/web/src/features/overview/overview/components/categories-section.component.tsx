import { CategoryDonut, Icon, Section } from '@fincheck/ui';
import { Button, Disclosure, DisclosurePanel, Heading } from 'react-aria-components';

import { CategoryInsightCard } from '#/features/overview/overview/components/category-insight-card.component.tsx';
import { OverviewLink } from '#/features/overview/overview/components/overview-link.component.tsx';
import type { CategoriesData } from '#/features/overview/overview/overview.model.ts';

type CategoriesSectionProps = {
  data: CategoriesData;
  /** On the phone the block is a closed row that opens the donut. */
  isCollapsible: boolean;
  allCategoriesHref: string;
};

function CategoriesBody({ data }: { data: CategoriesData }) {
  if (!data.hasSpending) {
    return <p className="text-body text-fg-secondary">Nenhum gasto neste mês ainda.</p>;
  }
  return (
    <CategoryDonut
      slices={data.slices}
      centerLabel="Gasto"
      centerTitle={data.centerTitle}
      centerDetail={data.centerDetail}
      aside={data.insight ? <CategoryInsightCard insight={data.insight} /> : undefined}
    />
  );
}

/** "Por categoria": donut with legend and the growth card; "Ver todas" opens Transações by category. */
export function CategoriesSection({
  data,
  isCollapsible,
  allCategoriesHref,
}: CategoriesSectionProps) {
  const link = <OverviewLink href={allCategoriesHref}>Ver todas</OverviewLink>;

  if (!isCollapsible) {
    return (
      <Section title="Por categoria" action={link}>
        <CategoriesBody data={data} />
      </Section>
    );
  }

  return (
    <section aria-label="Por categoria" className="border-t border-line pt-s8">
      <Disclosure className="group">
        <Heading level={2} className="m-0">
          <Button
            slot="trigger"
            className="focus-ring flex min-h-ctl-touch w-full cursor-pointer items-center gap-s8 rounded-input text-start"
          >
            <span className="font-title text-section font-heading text-fg-primary">
              Por categoria
            </span>
            {data.collapsedSummary ? (
              <span className="min-w-0 flex-1 truncate text-meta text-fg-secondary">
                · {data.collapsedSummary}
              </span>
            ) : (
              <span className="flex-1" />
            )}
            <Icon
              name="chevron-right"
              size="md"
              className="text-fg-secondary transition-transform duration-(--duration-fast) ease-(--ease-standard) group-data-[expanded]:rotate-90"
            />
          </Button>
        </Heading>
        <DisclosurePanel>
          <div className="flex flex-col gap-s16 pb-s16">
            <div className="flex justify-end">{link}</div>
            <CategoriesBody data={data} />
          </div>
        </DisclosurePanel>
      </Disclosure>
    </section>
  );
}
