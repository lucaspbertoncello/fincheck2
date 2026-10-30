import { Banner, Button, ContentSkeleton, EmptyState, RuleList } from '@fincheck/ui';

import { RuleForm } from '#/features/rules/rule-form/rule-form.component.tsx';
import type { useRuleListViewModel } from '#/features/rules/rule-list/rule-list.viewmodel.tsx';
import { RuleSuggestions } from '#/features/rules/rule-suggestion/rule-suggestions.component.tsx';

type RuleListViewProps = ReturnType<typeof useRuleListViewModel>;

/**
 * Categorias › Regras (screens.md): "Nova regra", the suggestion cards when there are any, and the
 * list of rules with the switch and the menu. Every state is here: skeleton, error with retry,
 * no rules yet, and the list.
 */
export function RuleListView({
  isLoading,
  isError,
  onRetry,
  actionError,
  onDismissActionError,
  rows,
  onActiveChange,
  onAction,
  onCreateRule,
  ruleForm,
}: RuleListViewProps) {
  return (
    <div className="flex flex-col gap-s24">
      {actionError ? (
        <Banner
          variant="error"
          title={actionError}
          actionLabel="Fechar"
          onAction={onDismissActionError}
        />
      ) : null}

      <div>
        <Button icon="plus-circle" onPress={onCreateRule}>
          Nova regra
        </Button>
      </div>

      <div className="flex flex-col gap-s24 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-col gap-s16 empty:hidden lg:flex-1">
          <RuleSuggestions />
        </div>

        <div className="min-w-0 lg:flex-1">
          {isLoading ? <ContentSkeleton variant="list" /> : null}

          {isError ? (
            <Banner
              variant="error"
              title="Não deu para carregar as regras"
              description="Confira se o app está rodando e tente de novo."
              actionLabel="Tentar de novo"
              onAction={onRetry}
            />
          ) : null}

          {!isLoading && !isError && rows.length === 0 ? (
            <EmptyState
              icon="magic"
              title="Nenhuma regra ainda"
              description="Depois de 3 recategorizações parecidas o app sugere uma regra. Ou crie a primeira agora."
              primaryAction={{ label: 'Criar regra', onPress: onCreateRule }}
            />
          ) : null}

          {!isLoading && !isError && rows.length > 0 ? (
            <RuleList rules={rows} onActiveChange={onActiveChange} onAction={onAction} />
          ) : null}
        </div>
      </div>

      <RuleForm
        target={ruleForm.target}
        onClose={ruleForm.onClose}
        onSaved={ruleForm.onSaved}
        onDelete={ruleForm.onDelete}
      />
    </div>
  );
}
