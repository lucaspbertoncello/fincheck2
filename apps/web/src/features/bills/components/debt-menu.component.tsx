import { OverflowMenu, type OverflowMenuItem } from '@fincheck/ui';

type DebtMenuProps = {
  /** The debt in words, for the accessible name: "Ações de Ingresso do show". */
  name: string;
  /** "Registrar recebimento" or "Registrar pagamento"; left out, the menu has no payment item. */
  registerLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
  onRegister?: () => void;
};

/** The "…" menu of a friend debt: Editar and Excluir, and the payment when the screen offers it. */
export function DebtMenu({ name, registerLabel, onEdit, onDelete, onRegister }: DebtMenuProps) {
  const items: OverflowMenuItem[] = [
    ...(registerLabel && onRegister
      ? [{ key: 'register', label: registerLabel, icon: 'check' } as const]
      : []),
    { key: 'edit', label: 'Editar', icon: 'edit' },
    { key: 'delete', label: 'Excluir', icon: 'trash', danger: true, separatorBefore: true },
  ];
  const actions: Record<string, () => void> = {
    register: () => onRegister?.(),
    edit: onEdit,
    delete: onDelete,
  };

  return (
    <OverflowMenu label={`Ações de ${name}`} items={items} onAction={(key) => actions[key]?.()} />
  );
}
