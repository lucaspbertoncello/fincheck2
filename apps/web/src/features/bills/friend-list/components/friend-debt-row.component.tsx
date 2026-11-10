import { BillRow } from '@fincheck/ui';

import { DebtMenu } from '#/features/bills/components/debt-menu.component.tsx';
import type { FriendDebtRowData } from '#/features/bills/friend-list/types/friend-list.type.ts';

type FriendDebtRowProps = {
  debt: FriendDebtRowData;
  onEdit: (billId: string) => void;
  onDelete: (target: { billId: string; person: string }) => void;
  onRegister: (billId: string) => void;
};

/**
 * A debt of a person on the standard bill row (the same as on A pagar e receber): the "…" menu
 * holds the payment, Editar and Excluir, so the row has no button of its own.
 */
export function FriendDebtRow({ debt, onEdit, onDelete, onRegister }: FriendDebtRowProps) {
  return (
    <BillRow
      name={debt.name}
      icon={debt.icon}
      flow={debt.flow}
      status={debt.status}
      badges={debt.badges}
      dueText={debt.dueText}
      amountCents={debt.amountCents}
      settledCents={debt.settledCents}
      menu={
        <DebtMenu
          name={debt.name}
          registerLabel={debt.registerLabel}
          onRegister={() => onRegister(debt.billId)}
          onEdit={() => onEdit(debt.billId)}
          onDelete={() => onDelete({ billId: debt.billId, person: debt.person })}
        />
      }
    />
  );
}
