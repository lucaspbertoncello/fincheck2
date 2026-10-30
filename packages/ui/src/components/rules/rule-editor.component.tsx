import type { ReactNode } from 'react';

import { Button } from '#/components/buttons/index.ts';
import { Checkbox } from '#/components/forms/index.ts';
import { RulePreview, type RulePreviewData } from '#/components/rules/rule-preview.component.tsx';
import { Section } from '#/components/sections/index.ts';
import { cx } from '#/utils/class-names.util.ts';

type RuleEditorProps = {
  /** "Nova regra", "Editar regra". */
  title?: string;
  /** Right of the title: the "Sugerida" chip. */
  badge?: ReactNode;
  /** Text above the sentence ("Você moveu 3 transações..."). */
  intro?: string;
  /** The sentence: `RuleSentenceText` and `RuleToken`s, in order. */
  sentence: ReactNode;
  /** History matches; absent hides the preview and the history option. */
  preview?: RulePreviewData;
  /** "Aplicar também nessas 14 transações". */
  historyLabel?: string;
  /** Under the option: "Recategoriza o histórico; edições feitas à mão não mudam." */
  historyHint?: string;
  applyToHistory?: boolean;
  onApplyToHistoryChange?: (value: boolean) => void;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit: () => void;
  onCancel: () => void;
  submitting?: boolean;
  submitDisabled?: boolean;
  className?: string;
};

/**
 * Rule editor as a sentence (components.md 9.1): the blanks are tokens, below are the preview of
 * the history matches, the "apply to history" option (starts unchecked; the screen opens the
 * confirmation when it is checked and sent) and the actions.
 */
export function RuleEditor({
  title = 'Nova regra',
  badge,
  intro,
  sentence,
  preview,
  historyLabel,
  historyHint,
  applyToHistory = false,
  onApplyToHistoryChange,
  submitLabel = 'Criar regra',
  cancelLabel = 'Agora não',
  onSubmit,
  onCancel,
  submitting,
  submitDisabled,
  className,
}: RuleEditorProps) {
  return (
    <Section title={title} action={badge} variant="glass" className={className}>
      {intro ? <p className="text-body text-fg-primary">{intro}</p> : null}
      <div className="flex flex-wrap items-center gap-x-s8 gap-y-s12">{sentence}</div>
      {preview ? <RulePreview preview={preview} /> : null}
      {historyLabel && onApplyToHistoryChange ? (
        <div className="flex flex-col">
          <Checkbox isSelected={applyToHistory} onChange={onApplyToHistoryChange}>
            {historyLabel}
          </Checkbox>
          {historyHint ? (
            <p className={cx('pl-s48 text-meta text-fg-secondary')}>{historyHint}</p>
          ) : null}
        </div>
      ) : null}
      <div className="flex items-center justify-end gap-s8">
        <Button variant="tertiary" onPress={onCancel}>
          {cancelLabel}
        </Button>
        <Button onPress={onSubmit} loading={submitting} isDisabled={submitDisabled}>
          {submitLabel}
        </Button>
      </div>
    </Section>
  );
}
