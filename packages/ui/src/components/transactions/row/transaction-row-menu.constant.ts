import type { OverflowMenuItem } from '#/components/menus/index.ts';

/** Row menu (components.md 6, "Menu da linha"): edit, split, ignore; then rule and recurrence. */
export const TRANSACTION_MENU_ITEMS: OverflowMenuItem[] = [
  { key: 'edit', label: 'Editar', icon: 'edit' },
  { key: 'split', label: 'Dividir', icon: 'split' },
  { key: 'ignore', label: 'Ignorar', icon: 'eye-off' },
  { key: 'create-rule', label: 'Criar regra', icon: 'magic', separatorBefore: true },
  { key: 'create-recurrence', label: 'Criar recorrência', icon: 'repeat' },
];

/** Same menu for an ignored transaction: "Ignorar" becomes "Voltar às contas". */
export const IGNORED_TRANSACTION_MENU_ITEMS: OverflowMenuItem[] = [
  { key: 'edit', label: 'Editar', icon: 'edit' },
  { key: 'restore', label: 'Voltar às contas', icon: 'eye' },
  { key: 'create-rule', label: 'Criar regra', icon: 'magic', separatorBefore: true },
  { key: 'create-recurrence', label: 'Criar recorrência', icon: 'repeat' },
];
