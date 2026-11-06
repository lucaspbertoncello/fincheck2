import { Chip, ConfirmDialog, RuleEditor } from '@fincheck/ui';

import { RuleSentence } from '#/features/rules/components/rule-sentence.component.tsx';
import type { useRuleSuggestionViewModel } from '#/features/rules/rule-suggestion/rule-suggestion.viewmodel.tsx';

type RuleSuggestionViewProps = ReturnType<typeof useRuleSuggestionViewModel>;

/**
 * The "Sugerida" cards of the Regras screen (screens.md): the same sentence as the rule modal, with
 * the text and the category fixed (they come from what was moved) and the tags free. "Agora não"
 * dismisses it; "Criar regra" accepts it. With no suggestion this draws nothing.
 */
export function RuleSuggestionView({
  cards,
  waitingCount,
  confirmDialog,
}: RuleSuggestionViewProps) {
  return (
    <>
      {cards.map((card) => (
        <div key={card.key} className="flex flex-col gap-s8">
          <RuleEditor
            title="Nova regra"
            badge={
              <Chip tone="accent" icon="magic">
                Sugerida
              </Chip>
            }
            intro={card.intro}
            sentence={
              <RuleSentence
                description={card.pattern}
                categoryId={card.categoryId}
                categoryGroups={card.categoryGroups}
                tags={card.tagOptions}
                tagIds={card.tagIds}
                onTagIdsChange={card.onTagIdsChange}
              />
            }
            preview={card.preview}
            historyLabel={card.historyOption?.label}
            historyHint={card.historyOption?.hint}
            applyToHistory={card.historyOption?.checked}
            onApplyToHistoryChange={card.historyOption ? card.onApplyToHistoryChange : undefined}
            onSubmit={card.onCreate}
            onCancel={card.onDismiss}
            submitting={card.isBusy}
          />
          {card.error ? (
            <p role="alert" className="px-s24 text-meta text-alert">
              {card.error}
            </p>
          ) : null}
        </div>
      ))}
      {waitingCount > 0 ? (
        <p className="px-s24 text-meta text-fg-secondary">
          {waitingCount === 1
            ? 'Mais 1 sugestão espera a sua resposta.'
            : `Mais ${waitingCount} sugestões esperam a sua resposta.`}
        </p>
      ) : null}
      {confirmDialog ? (
        <ConfirmDialog
          isOpen
          onOpenChange={(open) => !open && confirmDialog.onCancel()}
          title={confirmDialog.title}
          description={confirmDialog.description}
          icon="magic"
          changes={confirmDialog.changes}
          confirmLabel={confirmDialog.confirmLabel}
          loading={confirmDialog.loading}
          onConfirm={confirmDialog.onConfirm}
        />
      ) : null}
    </>
  );
}
