import { Button, CategoryIcon, Collapse, Icon, ListRow, Money } from '@fincheck/ui';
import { useEffect, useId, useRef } from 'react';

import { FriendDebtRow } from '#/features/bills/friend-list/components/friend-debt-row.component.tsx';
import { MenuSpace } from '#/shared/components/lists/menu-space.component.tsx';
import type {
  FriendListViewProps,
  FriendRowData,
} from '#/features/bills/friend-list/types/friend-list.type.ts';

type FriendRowProps = {
  friend: FriendRowData;
  /** The line above is the list's own rule: the first row has none. */
  first: boolean;
  isOpen: boolean;
  onToggle: (key: string) => void;
  /** Bring the row into view once (the person of `?person=`). */
  scrollTo: boolean;
  onNewDebt: (name: string) => void;
  onDebtEdit: FriendListViewProps['onDebtEdit'];
  onDebtDelete: FriendListViewProps['onDebtDelete'];
  onDebtRegister: FriendListViewProps['onDebtRegister'];
};

const MARK_TYPE = { 'owes-me': 'income', 'i-owe': 'expense', even: undefined } as const;
const VALUE_TONE = { 'owes-me': 'income', 'i-owe': 'expense', even: 'faded' } as const;

/**
 * One person on the standard list row: the mark with the arrow of who owes whom, the name (it
 * opens the debts, with a chevron after it), how many debts as the detail, and the balance at the
 * right end over "te deve", "você deve" or "quite". The debts unfold under the row with `Collapse`,
 * on the same bill row as A pagar e receber, followed by "Nova dívida" with the person filled in.
 * The empty box where the "…" would be keeps the balance in the column of the debts below it.
 */
export function FriendRow({
  friend,
  first,
  isOpen,
  onToggle,
  scrollTo,
  onNewDebt,
  onDebtEdit,
  onDebtDelete,
  onDebtRegister,
}: FriendRowProps) {
  const panelId = useId();
  const itemRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const item = itemRef.current;
    if (!scrollTo || !item || typeof item.scrollIntoView !== 'function') return;
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    item.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
  }, [scrollTo]);

  return (
    <li ref={itemRef} className={first ? 'scroll-mt-s24' : 'scroll-mt-s24 border-t border-line'}>
      <ListRow
        as="div"
        mark={<CategoryIcon icon="user" type={MARK_TYPE[friend.stance]} />}
        name={friend.name}
        onOpen={() => onToggle(friend.key)}
        openLabel={`Dívidas de ${friend.name}`}
        expanded={isOpen}
        controls={panelId}
        // One unit, so the chevron never sits alone on a line.
        badges={[
          <Icon
            name="chevron-down"
            size="md"
            className={`text-fg-secondary transition-transform duration-(--duration-fast) ${isOpen ? 'rotate-180' : ''}`}
          />,
        ]}
        detail={friend.detail}
        detailTitle={friend.detail}
        value={
          <Money
            cents={friend.balanceCents}
            sign="none"
            signColumn
            weight="plain"
            tone={VALUE_TONE[friend.stance]}
            className="text-money-row"
          />
        }
        valueNote={friend.note}
        menu={<MenuSpace />}
      />
      <Collapse isOpen={isOpen} id={panelId} contentClassName="pb-s12">
        <div role="group" aria-label={`Dívidas de ${friend.name}`}>
          <ul className="m-0 flex list-none flex-col divide-y divide-line border-t border-line p-0">
            {friend.debts.map((debt) => (
              <FriendDebtRow
                key={debt.billId}
                debt={debt}
                onEdit={onDebtEdit}
                onDelete={onDebtDelete}
                onRegister={onDebtRegister}
              />
            ))}
          </ul>
          <div className="flex pt-s8">
            <Button size="sm" variant="secondary" onPress={() => onNewDebt(friend.name)}>
              Nova dívida
            </Button>
          </div>
        </div>
      </Collapse>
    </li>
  );
}
