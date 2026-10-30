import type { FreeBalanceAccount } from '#/components/summary/free-balance.type.ts';
import { PanelListRow } from '#/components/summary/panel-list-row.component.tsx';

type AccountListProps = {
  title: string;
  items: FreeBalanceAccount[];
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

/** "Contas" of the panel: bank mark, name, sync state, balance (components.md 2.3). */
export function AccountList({ title, items }: AccountListProps) {
  return (
    <section aria-label={title} className="flex flex-col gap-s4">
      <h2 className="font-title text-section font-heading text-fg-primary">{title}</h2>
      <ul>
        {items.map((account) => (
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
    </section>
  );
}
