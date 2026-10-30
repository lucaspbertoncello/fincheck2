import { Button } from 'react-aria-components';

import { CATEGORY_COLUMNS_CLASS } from '#/components/categories/category-columns.constant.ts';
import { countLabel } from '#/components/categories/count-label.util.ts';
import type { ManagedCategory } from '#/components/categories/managed-category.type.ts';
import { CategoryIcon } from '#/components/icons/category-icon.component.tsx';
import { Icon } from '#/components/icons/icon.component.tsx';
import { OverflowMenu } from '#/components/menus/overflow-menu.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

const MENU_ITEMS = [
  { key: 'edit', label: 'Editar', icon: 'edit' },
  { key: 'archive', label: 'Arquivar', icon: 'archive' },
] as const;

type CategoryRowProps = {
  category: ManagedCategory;
  onEdit: (id: string) => void;
  onArchive: (id: string) => void;
};

/**
 * Row of an active category: 40 px icon, name, transactions, rules, last use and the "…" menu.
 * On the phone the name button covers the whole row (tap to edit), the counts go under the name
 * and the last use stays at the right.
 */
export function CategoryRow({ category, onEdit, onArchive }: CategoryRowProps) {
  const { id, name, icon, transactionCount, ruleCount, lastUsedLabel } = category;

  return (
    <li
      role="row"
      className={cx(
        'relative flex items-center gap-s12 border-b border-line py-s12',
        'transition-colors duration-(--duration-fast) hover:bg-linear-to-r hover:from-subtle hover:to-transparent',
        CATEGORY_COLUMNS_CLASS,
      )}
    >
      <div role="cell">
        <CategoryIcon icon={icon} />
      </div>
      <div role="cell" className="flex min-w-0 flex-1 flex-col">
        <Button
          onPress={() => onEdit(id)}
          className="focus-ring cursor-pointer truncate rounded-tiny text-left text-body font-emphasis text-fg-primary max-lg:after:absolute max-lg:after:inset-0 max-lg:after:content-['']"
        >
          {name}
        </Button>
        <span className="text-meta text-fg-secondary lg:hidden">
          {countLabel(transactionCount, 'transação', 'transações')}
          {ruleCount > 0 ? ` · ${countLabel(ruleCount, 'regra', 'regras')}` : null}
        </span>
      </div>
      <div
        role="cell"
        className="text-right text-list text-fg-primary tabular-nums max-lg:hidden"
        aria-label={countLabel(transactionCount, 'transação', 'transações')}
      >
        {transactionCount}
      </div>
      <div role="cell" className="text-list text-fg-primary max-lg:hidden">
        {ruleCount > 0 ? (
          <span className="inline-flex items-center gap-s8">
            <Icon name="magic" size="sm" className="text-fg-secondary" />
            {countLabel(ruleCount, 'regra', 'regras')}
          </span>
        ) : (
          <span aria-label="Nenhuma regra" className="text-fg-tertiary">
            —
          </span>
        )}
      </div>
      <div
        role="cell"
        className="max-w-28 text-right text-meta text-fg-secondary lg:max-w-none lg:text-left lg:text-label"
      >
        {lastUsedLabel}
      </div>
      <div role="cell" className="relative flex justify-end">
        <OverflowMenu
          label={`Ações de ${name}`}
          items={[...MENU_ITEMS]}
          onAction={(key) => (key === 'edit' ? onEdit(id) : onArchive(id))}
        />
      </div>
    </li>
  );
}
