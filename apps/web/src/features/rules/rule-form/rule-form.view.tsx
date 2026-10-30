import {
  Checkbox,
  ConfirmDialog,
  FormModal,
  FormModalGroup,
  type RulePreviewData,
} from '@fincheck/ui';
import type { ConfirmChange } from '@fincheck/ui';
import type { RefObject } from 'react';

import {
  RulePreviewArea,
  type RulePreviewStatus,
} from '#/features/rules/rule-form/components/rule-preview-area.component.tsx';
import { RuleSentence } from '#/features/rules/rule-form/components/rule-sentence.component.tsx';
import type {
  AccountOption,
  CategoryGroup,
  RuleFormErrors,
  TagOption,
} from '#/features/rules/rule-form/types/rule-form.type.ts';

type RuleFormViewProps = {
  formRef: RefObject<HTMLDivElement | null>;
  title: string;
  subtitle: string;
  submitLabel: string;
  description: string;
  onDescriptionChange: (value: string) => void;
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
  description,
  onDescriptionChange,
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
            <div className="rounded-panel border border-line bg-glass p-s16">
              <RuleSentence
                description={description}
                onDescriptionChange={onDescriptionChange}
                descriptionInvalid={errors.description !== undefined}
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
            {errors.action ? (
              <p
                role="alert"
                data-invalid-field={errors.description ? undefined : true}
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
