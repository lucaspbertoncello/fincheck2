import type { PlusMenuItem } from '@fincheck/ui';

/**
 * Where each "+" action leads: the screen that owns the modal, with the search param that screen
 * reads to open it (`?new=...`). The month is appended by `buildHref`.
 */
export const PLUS_ACTION_PATHS: Record<string, string> = {
  'new-transaction': '/transactions?new=transaction',
  'new-installment': '/transactions?new=installment',
  'new-bill': '/recurrences/bills?new=bill',
  'new-debt': '/recurrences/bills?new=debt',
  'new-recurrence': '/recurrences?new=recurrence',
  // Nova recorrência already as an expense on the card, without leaving the Assinaturas tab.
  'new-subscription': '/recurrences/subscriptions?new=subscription',
  'connect-account': '/accounts?new=account',
  'new-category': '/categories?new=category',
  'new-rule': '/categories/rules?new=rule',
  'new-income-source': '/recurrences?new=recurrence&flow=income',
};

/** Menu of the general "+" (screens.md, "Botão +"). */
export const PLUS_MENU_ITEMS: PlusMenuItem[] = [
  {
    key: 'new-transaction',
    label: 'Nova transação',
    description: 'Despesa ou receita lançada à mão',
    icon: 'list',
  },
  {
    key: 'new-installment',
    label: 'Compra parcelada',
    description: 'Lançada à mão, com as parcelas',
    icon: 'card',
  },
  { key: 'new-bill', label: 'Nova conta a pagar ou receber', icon: 'calendar' },
  {
    key: 'new-debt',
    label: 'Dívida com amigo',
    description: 'Eu devo ou me devem',
    icon: 'debt',
  },
  { key: 'new-recurrence', label: 'Nova recorrência', icon: 'repeat' },
  { key: 'connect-account', label: 'Conectar conta', icon: 'plug', separatorBefore: true },
  { key: 'new-category', label: 'Nova categoria', icon: 'tag' },
  { key: 'new-rule', label: 'Nova regra', icon: 'magic' },
];
