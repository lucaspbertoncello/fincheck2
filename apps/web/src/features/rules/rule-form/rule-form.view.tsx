import {
  Checkbox,
  ChoiceChip,
  ConfirmDialog,
  FormModal,
  FormModalGroup,
  SegmentedControl,
  type RulePreviewData,
  type SegmentedOption,
} from '@fincheck/ui';
import type { ConfirmChange } from '@fincheck/ui';
import type { RefObject } from 'react';

import { RulePreviewArea } from '#/features/rules/rule-form/components/rule-preview-area.component.tsx';
import type { RulePreviewStatus } from '#/features/rules/rule-form/types/rule-preview-status.type.ts';
import { RuleSentence } from '#/features/rules/components/rule-sentence.component.tsx';
import type {
  AccountOption,
  CategoryGroup,
  RuleFormErrors,
  RuleTextMode,
  TagOption,
} from '#/features/rules/types/rule-form.type.ts';

const TEXT_MODE_OPTIONS: SegmentedOption[] = [
  { key: 'description', label: 'Descrição' },
  { key: 'counterparty', label: 'Quem mandou ou recebeu' },
  { key: 'both', label: 'Os dois' },
];

type RuleFormViewProps = {
  formRef: RefObject<HTMLDivElement | null>;
  title: string;
  subtitle: string;
  submitLabel: string;
  textMode: RuleTextMode;
  onTextModeChange: (mode: RuleTextMode) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  counterparty: string;
  onCounterpartyChange: (value: string) => void;
  accountId: string | null;
  accounts: AccountOption[];
  onAccountChange: (accountId: string | null) => void;
  categoryId: string | null;
  categoryGroups: CategoryGroup[];
  onCategoryChange: (categoryId: string | null) => void;
  tagOptions: TagOption[];
  tagIds: string[];
  onTagIdsChange: (tagIds: string[]) => void;
  errors: RuleFormErrors;
  submitError: string | null;
  previewStatus: RulePreviewStatus;
  preview: RulePreviewData | undefined;
  onRetryPreview: () => void;
  historyOption: {
    label: string;
    hint: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
  } | null;
  isSaving: boolean;
  isConfirming: boolean;
  confirmDialog: {
    title: string;
    description: string;
    changes: ConfirmChange[];
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
  };
  /** Edit only: "Excluir" at the left of the footer (the screen offers the undo). */
  onDelete: (() => void) | null;
  onSubmit: () => void;
  onClose: () => void;
};

/**
 * The "Nova regra" / "Editar regra" modal in the form pattern: the rule as a sentence typed in
 * place (the protagonist), then the live preview of what it matches in the history, the "apply to
 * the history" option and, when it is checked, the confirmation.
 */
export function RuleFormView({
  formRef,
  title,
  subtitle,
  submitLabel,
  textMode,
  onTextModeChange,
  description,
  onDescriptionChange,
  counterparty,
  onCounterpartyChange,
  accountId,
  accounts,
  onAccountChange,
  categoryId,
  categoryGroups,
  onCategoryChange,
  tagOptions,
  tagIds,
  onTagIdsChange,
  errors,
  submitError,
  previewStatus,
  preview,
  onRetryPreview,
  historyOption,
  isSaving,
  isConfirming,
  confirmDialog,
  onDelete,
  onSubmit,
  onClose,
}: RuleFormViewProps) {
  return (
    <>
      <FormModal
        isOpen={!isConfirming}
        onOpenChange={(open) => !open && onClose()}
        title={title}
        description={subtitle}
        submitLabel={submitLabel}
        onSubmit={onSubmit}
        isSubmitting={isSaving}
        error={submitError ?? undefined}
        destructive={onDelete ? { label: 'Excluir', onPress: onDelete } : undefined}
        initialFocus='input[type="text"]'
      >
        <div ref={formRef} className="flex flex-col gap-s16 lg:gap-s24">
          <FormModalGroup label="A regra">
            <div className="flex flex-col gap-s16 rounded-panel border border-line bg-glass p-s16">
              {/* Under 480 px the three labels do not fit a segmented control: chips, one line each. */}
              <div className="max-[479px]:hidden">
                <SegmentedControl
                  label="Condição de texto da regra"
                  options={TEXT_MODE_OPTIONS}
                  value={textMode}
                  onChange={(key) => onTextModeChange(key as RuleTextMode)}
                />
              </div>
              <div
                role="group"
                aria-label="Condição de texto da regra"
                className="flex flex-wrap gap-s8 min-[480px]:hidden"
              >
                {TEXT_MODE_OPTIONS.map((option) => (
                  <ChoiceChip
                    key={option.key}
                    selected={textMode === option.key}
                    onChange={() => onTextModeChange(option.key as RuleTextMode)}
                  >
                    {option.label}
                  </ChoiceChip>
                ))}
              </div>
              <RuleSentence
                mode={textMode}
                description={description}
                onDescriptionChange={onDescriptionChange}
                descriptionInvalid={errors.description !== undefined}
                counterparty={counterparty}
                onCounterpartyChange={onCounterpartyChange}
                counterpartyInvalid={errors.counterparty !== undefined}
                accountId={accountId}
                accounts={accounts}
                onAccountChange={onAccountChange}
                categoryId={categoryId}
                categoryGroups={categoryGroups}
                onCategoryChange={onCategoryChange}
                tags={tagOptions}
                tagIds={tagIds}
                onTagIdsChange={onTagIdsChange}
              />
            </div>
            {errors.description ? (
              <p role="alert" data-invalid-field tabIndex={-1} className="text-meta text-alert">
                {errors.description}
              </p>
            ) : null}
            {errors.counterparty ? (
              <p
                role="alert"
                data-invalid-field={errors.description ? undefined : true}
                tabIndex={-1}
                className="text-meta text-alert"
              >
                {errors.counterparty}
              </p>
            ) : null}
            {errors.action ? (
              <p
                role="alert"
                data-invalid-field={errors.description || errors.counterparty ? undefined : true}
                tabIndex={-1}
                className="text-meta text-alert"
              >
                {errors.action}
              </p>
            ) : null}
          </FormModalGroup>

          <FormModalGroup label="O que ela pega no histórico">
            <RulePreviewArea status={previewStatus} preview={preview} onRetry={onRetryPreview} />
            {historyOption ? (
              <div className="flex flex-col rounded-input border border-line p-s12">
                <Checkbox isSelected={historyOption.checked} onChange={historyOption.onChange}>
                  {historyOption.label}
                </Checkbox>
                <p className="pl-s48 text-meta text-fg-secondary">{historyOption.hint}</p>
              </div>
            ) : null}
          </FormModalGroup>
        </div>
      </FormModal>
      <ConfirmDialog
        isOpen={isConfirming}
        onOpenChange={(open) => !open && confirmDialog.onCancel()}
        title={confirmDialog.title}
        description={confirmDialog.description}
        icon="magic"
        changes={confirmDialog.changes}
        confirmLabel={confirmDialog.confirmLabel}
        loading={isSaving}
        onConfirm={confirmDialog.onConfirm}
      />
    </>
  );
}
