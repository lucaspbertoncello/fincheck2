import { Button, CategoryIcon, ListRow, Money } from '@fincheck/ui';

import type { FriendFoundPixRowData } from '#/features/bills/friend-list/types/friend-list.type.ts';
import { MenuSpace } from '#/shared/components/lists/menu-space.component.tsx';

type FriendFoundPixRowProps = {
  pix: FriendFoundPixRowData;
  onLink: (billId: string) => void;
  isLinking: boolean;
};

/**
 * A Pix the system found in the account for a debt of the person, not linked yet: the standard
 * list row with the value at the right end and "Vincular", the same link A pagar e receber offers
 * on that debt. It explains why the card there already counts the debt as received.
 */
export function FriendFoundPixRow({ pix, onLink, isLinking }: FriendFoundPixRowProps) {
  return (
    <ListRow
      mark={<CategoryIcon icon="link" type="income" />}
      name={pix.title}
      detail={pix.detail}
      detailTitle={pix.detail}
      value={
        <Money
          cents={pix.amountCents}
          sign="plus"
          signColumn
          weight="plain"
          tone="income"
          className="text-money-row"
        />
      }
      menu={<MenuSpace />}
      actions={
        <Button
          size="sm"
          variant="secondary"
          isDisabled={isLinking}
          onPress={() => onLink(pix.billId)}
        >
          Vincular
        </Button>
      }
    />
  );
}
