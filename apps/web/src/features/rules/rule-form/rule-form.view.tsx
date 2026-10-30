import { Button, Checkbox, ConfirmDialog, Modal, type RulePreviewData } from '@fincheck/ui';
import type { ConfirmChange } from '@fincheck/ui';
import type { RefObject } from 'react';

import {
  RulePreviewArea,
  type RulePreviewStatus,
} from '#/features/rules/rule-form/components/rule-preview-area.component.tsx';
import { RuleSentence } from '#/features/rules/rule-form/components/rule-sentence.component.tsx';
import type {
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
  onSubmit: () => void;
  onClose: () => void;
};

const FORM_ID = 'rule-form';

/**
 * The "Nova regra" / "Editar regra" modal: the rule as a sentence, the preview of what it matches in
 * the history, the "apply to the history" option and, when it is checked, the confirmation.
 */
export function RuleFormView({
  formRef,
  title,
  subtitle,
  submitLabel,
  description,
  onDescriptionChange,
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
  onSubmit,
  onClose,
}: RuleFormViewProps) {
  return (
    <>
      <Modal
        isOpen={!isConfirming}
        onOpenChange={(open) => !open && onClose()}
        isDismissable={!isSaving}
        size="wide"
        title={title}
        subtitle={subtitle}
        actions={
          <>
            <Button variant="secondary" isDisabled={isSaving} onPress={onClose}>
              Cancelar
            </Button>
            <Button type="submit" form={FORM_ID} loading={isSaving}>
              {submitLabel}
            </Button>
          </>
        }
      >
        <form
          id={FORM_ID}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div ref={formRef} className="flex flex-col gap-s16">
            <RuleSentence
              description={description}
              onDescriptionChange={onDescriptionChange}
              descriptionInvalid={errors.description !== undefined}
              categoryId={categoryId}
              categoryGroups={categoryGroups}
              onCategoryChange={onCategoryChange}
              tags={tagOptions}
              tagIds={tagIds}
              onTagIdsChange={onTagIdsChange}
            />
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
            <RulePreviewArea status={previewStatus} preview={preview} onRetry={onRetryPreview} />
            {historyOption ? (
              <div className="flex flex-col">
                <Checkbox isSelected={historyOption.checked} onChange={historyOption.onChange}>
                  {historyOption.label}
                </Checkbox>
                <p className="pl-s48 text-meta text-fg-secondary">{historyOption.hint}</p>
              </div>
            ) : null}
            {submitError ? (
              <p role="alert" className="text-meta text-alert">
                {submitError}
              </p>
            ) : null}
          </div>
        </form>
      </Modal>
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
