import { Money } from '#/components/money/index.ts';

type GroupHeaderProps = {
  /** Heading id, so the group section can label itself with it. */
  id: string;
  /** "Hoje", "Segunda", "Despesas". */
  title: string;
  /** "22 de outubro", "por categoria". */
  subtitle?: string;
  /** "2 transações", "10 categorias". */
  countLabel: string;
  /** Total of the group; negative shows "−". */
  totalCents: number;
  /** "plus" for income groups, which have no negative values. */
  sign?: 'auto' | 'plus' | 'minus';
};

/**
 * Header of a block of rows (components.md 6, "Bloco do dia"): title 18 / 550, the date, the count
 * and the total at the right, with a rule below. Shared by the day groups and the category groups.
 */
export function GroupHeader({
  id,
  title,
  subtitle,
  countLabel,
  totalCents,
  sign = 'auto',
}: GroupHeaderProps) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-s16 gap-y-s4 border-b border-line pb-s12">
      <h3 id={id} className="flex min-w-0 items-baseline gap-s8">
        <span className="font-title text-(length:--font-size-day-title-mobile) font-heading text-fg-primary lg:text-(length:--font-size-day-title)">
          {title}
        </span>
        {subtitle ? <span className="text-list text-fg-secondary">{subtitle}</span> : null}
      </h3>
      <p className="flex items-baseline gap-s12 text-meta text-fg-secondary">
        <span>{countLabel}</span>
        <Money cents={totalCents} sign={sign} weight="plain" className="text-list" />
      </p>
    </header>
  );
}
