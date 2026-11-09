import type { OverflowMenuItem } from '#/components/menus/index.ts';
import {
  IGNORED_TRANSACTION_MENU_ITEMS,
  TRANSACTION_MENU_ITEMS,
} from '#/components/transactions/row/transaction-row-menu.constant.ts';

/** The row menu of a transaction: "Criar recorrência" is left out when it is already linked to one. */
export function buildTransactionMenuItems(transaction: {
  ignored?: boolean;
  recurring?: boolean;
}): OverflowMenuItem[] {
  const items = transaction.ignored ? IGNORED_TRANSACTION_MENU_ITEMS : TRANSACTION_MENU_ITEMS;

  return transaction.recurring ? items.filter((item) => item.key !== 'create-recurrence') : items;
}
