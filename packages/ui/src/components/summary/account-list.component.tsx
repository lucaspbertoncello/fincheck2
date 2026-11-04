import { Link } from 'react-aria-components';

import { Icon } from '#/components/icons/icon.component.tsx';
import type { FreeBalanceAccount } from '#/components/summary/free-balance.type.ts';
import { PanelListRow } from '#/components/summary/panel-list-row.component.tsx';

/** The panel shows this many accounts; the rest is behind "Ver mais". */
const VISIBLE_ACCOUNTS = 2;

type AccountListProps = {
  title: string;
  items: FreeBalanceAccount[];
  /** Target of "Ver mais" (the full list). Without it the link is not drawn. */
  moreHref?: string;
};

/** Bank circle (36 px) with the initial of the name, until a feature provides the bank mark. */
function InitialMark({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-9 shrink-0 place-items-center rounded-capsule border border-line bg-subtle font-title text-label font-heading text-fg-secondary"
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/** "Contas" of the panel: the first two, with the count of the rest and a link to all of them. */
export function AccountList({ title, items, moreHref }: AccountListProps) {
  const visible = items.slice(0, VISIBLE_ACCOUNTS);
  const rest = items.length - visible.length;

  return (
    <section aria-label={title} className="flex flex-col gap-s4">
      <h2 className="font-title text-section font-heading text-fg-primary">{title}</h2>
      <ul>
        {visible.map((account) => (
          <PanelListRow
            key={account.id}
            mark={account.mark ?? <InitialMark name={account.name} />}
            name={account.name}
            subtitle={account.subtitle}
            warn={account.subtitleTone === 'warn'}
            cents={account.balanceCents}
          />
        ))}
      </ul>
      {rest > 0 && moreHref ? (
        <Link
          href={moreHref}
          className="flex w-fit cursor-pointer items-center gap-s4 rounded-input py-s4 text-label font-emphasis text-brand no-underline outline-none transition-colors duration-(--duration-fast) data-[focus-visible]:outline-2 data-[focus-visible]:outline-offset-2 data-[focus-visible]:outline-brand data-[hovered]:text-fg-primary"
        >
          Ver mais · {rest} {rest === 1 ? 'conta' : 'contas'}
          <Icon name="chevron-right" size="xs" />
        </Link>
      ) : null}
    </section>
  );
}
