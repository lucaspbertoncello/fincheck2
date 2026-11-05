import { type ReactNode, useId } from 'react';

import { countLabel } from '#/utils/count-label.util.ts';
import { GroupHeader } from '#/components/transactions/list/group-header.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type CategoryGroupListProps = {
  /** "Despesas", "Receitas". */
  title: string;
  /** "por categoria", "por fonte". */
  subtitle: string;
  /** How many groups: "10 categorias" is built from it. */
  count: number;
  /** "categoria"/"categorias", "fonte"/"fontes". */
  noun: { singular: string; plural: string };
  /** Total of the list in cents, positive. */
  totalCents: number;
  kind: 'expense' | 'income';
  /** The `CategoryGroup`s, ordered by value. */
  children: ReactNode;
  className?: string;
};

/** "Despesas por categoria" block (components.md 6.2): same header as a day block, then the groups. */
export function CategoryGroupList({
  title,
  subtitle,
  count,
  noun,
  totalCents,
  kind,
  children,
  className,
}: CategoryGroupListProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cx('flex flex-col', className)}>
      <GroupHeader
        id={headingId}
        title={title}
        subtitle={subtitle}
        countLabel={countLabel(count, noun.singular, noun.plural)}
        totalCents={totalCents}
        sign={kind === 'income' ? 'plus' : 'minus'}
      />
      <div className="flex flex-col">{children}</div>
    </section>
  );
}
