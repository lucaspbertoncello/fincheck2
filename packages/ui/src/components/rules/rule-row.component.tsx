import { Link } from 'react-aria-components';

import { Switch } from '#/components/forms/index.ts';
import { CategoryIcon } from '#/components/icons/index.ts';
import { OverflowMenu, type OverflowMenuItem } from '#/components/menus/index.ts';
import { RulePhrase } from '#/components/rules/rule-phrase.component.tsx';
import type { RuleAction, RuleRowData } from '#/components/rules/rule-phrase.type.ts';
import { cx } from '#/utils/class-names.util.ts';

const MENU_ITEMS: OverflowMenuItem[] = [
  { key: 'edit', label: 'Editar', icon: 'edit' },
  { key: 'view-transactions', label: 'Ver transações', icon: 'list' },
  { key: 'apply', label: 'Aplicar nas transações existentes', icon: 'magic' },
  { key: 'delete', label: 'Excluir', icon: 'trash', danger: true, separatorBefore: true },
];

type RuleRowProps = {
  rule: RuleRowData;
  onActiveChange: (active: boolean) => void;
  onAction: (action: RuleAction) => void;
  className?: string;
};

/** "Aplicada 1 vez" / "Aplicada 38 vezes". */
function appliedLabel(count: number): string {
  return count === 1 ? 'Aplicada 1 vez' : `Aplicada ${count} vezes`;
}

/**
 * Rule row (components.md 9.2): sentence at 15 with the tokens in 500, the "Aplicada N vezes"
 * link that opens the transactions, the on/off switch and the "…" menu. An off rule is at 60%. On
 * the phone the row breaks and the controls go below with the "Ativa" label.
 */
export function RuleRow({ rule, onActiveChange, onAction, className }: RuleRowProps) {
  return (
    <li
      className={cx(
        'grid grid-cols-[auto_1fr] items-center gap-x-s12 py-s16 lg:grid-cols-[auto_1fr_auto_auto]',
        !rule.active && 'opacity-60',
        className,
      )}
    >
      <CategoryIcon icon={rule.icon} />
      <div className="min-w-0">
        <p className="text-list text-fg-primary">
          <RulePhrase segments={rule.phrase} />
        </p>
        <p className="mt-s4 text-meta text-fg-secondary">
          {rule.active ? null : 'Desativada. '}
          <Link
            onPress={() => onAction('view-transactions')}
            className="focus-ring cursor-pointer text-brand underline underline-offset-2"
          >
            {appliedLabel(rule.appliedCount)}
          </Link>
        </p>
      </div>
      <div className="col-span-full flex items-center justify-between gap-s8 lg:contents">
        <span className="text-list text-fg-primary lg:hidden" aria-hidden="true">
          {rule.active ? 'Ativa' : 'Desativada'}
        </span>
        <div className="flex items-center gap-s4">
          <Switch
            isSelected={rule.active}
            onChange={onActiveChange}
            ariaLabel={rule.active ? 'Regra ativa' : 'Regra desativada'}
          />
          <OverflowMenu
            label="Ações da regra"
            items={MENU_ITEMS}
            onAction={(key) => onAction(key as RuleAction)}
          />
        </div>
      </div>
    </li>
  );
}
