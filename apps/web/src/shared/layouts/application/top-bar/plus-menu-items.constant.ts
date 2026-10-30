import type { PlusMenuItem } from '@fincheck/ui';

/** Where each "+" action leads until the creation modals exist (each modal opens on its own screen). */
export const PLUS_ACTION_PATHS: Record<string, string> = {
  'new-transaction': '/transactions',
  'new-installment': '/transactions',
  'new-bill': '/recurrences/bills',
  'new-debt': '/recurrences/bills',
  'new-recurrence': '/recurrences',
  'connect-account': '/accounts',
  'new-category': '/categories',
  'new-rule': '/categories/rules',
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
