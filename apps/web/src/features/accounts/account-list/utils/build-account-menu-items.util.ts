import type { OverflowMenuItem } from '@fincheck/ui';

/** The "…" menu of an account or card: archive (or restore) and delete, which asks to confirm. */
export function buildAccountMenuItems(isArchived: boolean): OverflowMenuItem[] {
  return [
    isArchived
      ? { key: 'unarchive', label: 'Desarquivar', icon: 'archive' }
      : { key: 'archive', label: 'Arquivar', icon: 'archive' },
    { key: 'delete', label: 'Excluir', icon: 'trash', danger: true, separatorBefore: true },
  ];
}
