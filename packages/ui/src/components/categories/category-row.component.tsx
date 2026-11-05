import { countLabel } from '#/components/categories/count-label.util.ts';
import type { ManagedCategory } from '#/components/categories/managed-category.type.ts';
import { CategoryIcon } from '#/components/icons/category-icon.component.tsx';
import { ListRow } from '#/components/list-row/index.ts';
import { OverflowMenu } from '#/components/menus/overflow-menu.component.tsx';

const MENU_ITEMS = [
  { key: 'edit', label: 'Editar', icon: 'edit' },
  { key: 'archive', label: 'Arquivar', icon: 'archive' },
] as const;

type CategoryRowProps = {
  category: ManagedCategory;
  onEdit: (id: string) => void;
  /** Opens the category page; without it the name edits. */
  onOpen?: (id: string) => void;
  onArchive: (id: string) => void;
};

/**
 * Row of an active category on the standard list row (components.md 10.0): icon, the name (a
 * button that opens the category), the detail "N regras · último uso ...", the transaction count at
 * the right end ("221" over "transações", the composed value) and the "…" menu. This screen never
 * shows money, so the count is the value.
 */
export function CategoryRow({ category, onEdit, onOpen, onArchive }: CategoryRowProps) {
  const { id, name, icon, transactionCount, ruleCount, lastUsedLabel } = category;
  const detail = [
    ruleCount > 0 ? countLabel(ruleCount, 'regra', 'regras') : 'Sem regras',
    `último uso ${lastUsedLabel}`,
  ].join(' · ');

  return (
    <ListRow
      mark={<CategoryIcon icon={icon} />}
      name={name}
      onOpen={() => (onOpen ?? onEdit)(id)}
      openLabel={`Abrir ${name}`}
      detail={detail}
      detailTitle={detail}
      value={
        <span className="text-money-row font-plain text-fg-primary tabular-nums">
          {transactionCount}
        </span>
      }
      valueNote={transactionCount === 1 ? 'transação' : 'transações'}
      menu={
        <OverflowMenu
          label={`Ações de ${name}`}
          items={[...MENU_ITEMS]}
          onAction={(key) => (key === 'edit' ? onEdit(id) : onArchive(id))}
        />
      }
    />
  );
}
