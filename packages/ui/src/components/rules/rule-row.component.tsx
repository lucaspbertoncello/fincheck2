import { Button } from '#/components/buttons/index.ts';
import { Chip } from '#/components/chips/index.ts';
import { Switch } from '#/components/forms/index.ts';
import { CategoryIcon } from '#/components/icons/index.ts';
import { ListRow } from '#/components/list-row/index.ts';
import { OverflowMenu, type OverflowMenuItem } from '#/components/menus/index.ts';
import { buildRulePhraseText } from '#/components/rules/build-rule-phrase-text.util.ts';
import { RulePhrase } from '#/components/rules/rule-phrase.component.tsx';
import type { RuleAction, RuleRowData } from '#/components/rules/rule-phrase.type.ts';

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
 * Rule row on the standard list row (components.md 9.2, 10.0): the category icon, the name (where
 * the rule sends to, given by the caller), the sentence as the detail with its tokens in 500, the on/off switch at the
 * right end and the "…" menu after it. "Aplicada N vezes", which opens the transactions, is the
 * button of the strip. An off rule is at 60% and carries the "Desativada" badge.
 */
export function RuleRow({ rule, onActiveChange, onAction, className }: RuleRowProps) {
  const phraseText = buildRulePhraseText(rule.phrase);

  return (
    <ListRow
      mark={<CategoryIcon icon={rule.icon} />}
      name={rule.name}
      badges={rule.active ? undefined : [<Chip key="off">Desativada</Chip>]}
      detail={<RulePhrase segments={rule.phrase} />}
      detailTitle={phraseText}
      value={
        <Switch
          isSelected={rule.active}
          onChange={onActiveChange}
          ariaLabel={rule.active ? 'Regra ativa' : 'Regra desativada'}
        />
      }
      menu={
        <OverflowMenu
          label="Ações da regra"
          items={MENU_ITEMS}
          onAction={(key) => onAction(key as RuleAction)}
        />
      }
      actions={
        <Button variant="tertiary" size="sm" onPress={() => onAction('view-transactions')}>
          {appliedLabel(rule.appliedCount)}
        </Button>
      }
      className={rule.active ? className : `opacity-60 ${className ?? ''}`}
    />
  );
}
