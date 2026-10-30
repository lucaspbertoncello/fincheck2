import { RuleRow } from '#/components/rules/rule-row.component.tsx';
import type { RuleAction, RuleRowData } from '#/components/rules/rule-phrase.type.ts';
import { Section } from '#/components/sections/index.ts';

type RuleListProps = {
  /** "Regras ativas". */
  title?: string;
  rules: readonly RuleRowData[];
  onActiveChange: (id: string, active: boolean) => void;
  onAction: (id: string, action: RuleAction) => void;
  /** Shown when there are no rules. */
  emptyMessage?: string;
  className?: string;
};

/** The rules list (components.md 9.2): section with the count ("5 regras") and one row per rule. */
export function RuleList({
  title = 'Regras ativas',
  rules,
  onActiveChange,
  onAction,
  emptyMessage = 'Nenhuma regra ainda.',
  className,
}: RuleListProps) {
  const count = rules.length === 1 ? '1 regra' : `${rules.length} regras`;

  return (
    <Section
      title={title}
      divider={false}
      className={className}
      action={<span className="text-label text-fg-secondary">{count}</span>}
    >
      {rules.length === 0 ? (
        <p className="text-label text-fg-secondary">{emptyMessage}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              onActiveChange={(active) => onActiveChange(rule.id, active)}
              onAction={(action) => onAction(rule.id, action)}
            />
          ))}
        </ul>
      )}
    </Section>
  );
}
