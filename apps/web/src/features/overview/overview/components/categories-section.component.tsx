import { CategoryDonut, Collapse, Icon, LinkButton, Section } from '@fincheck/ui';
import { useId, useState, type ReactNode } from 'react';
import { Button, Heading } from 'react-aria-components';

import { CategoryInsightCard } from '#/features/overview/overview/components/category-insight-card.component.tsx';
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

function CollapsibleCategories({ data, link }: { data: CategoriesData; link: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <section aria-label="Por categoria" className="border-t border-line pt-s8">
      <Heading level={2} className="m-0">
        <Button
          aria-expanded={isOpen}
          aria-controls={panelId}
          onPress={() => setIsOpen((current) => !current)}
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
            className={`text-fg-secondary transition-transform duration-(--duration-fast) ease-(--ease-standard) ${isOpen ? 'rotate-90' : ''}`}
          />
        </Button>
      </Heading>
      <Collapse isOpen={isOpen} id={panelId}>
        <div className="flex flex-col gap-s16 pb-s16">
          <div className="flex justify-end">{link}</div>
          <CategoriesBody data={data} />
        </div>
      </Collapse>
    </section>
  );
}

/** "Por categoria": donut with legend and the growth card; "Ver todas" opens Transações by category. */
export function CategoriesSection({
  data,
  isCollapsible,
  allCategoriesHref,
}: CategoriesSectionProps) {
  const link = <LinkButton href={allCategoriesHref}>Ver todas</LinkButton>;

  if (!isCollapsible) {
    return (
      <Section title="Por categoria" action={link}>
        <CategoriesBody data={data} />
      </Section>
    );
  }

  return <CollapsibleCategories data={data} link={link} />;
}
