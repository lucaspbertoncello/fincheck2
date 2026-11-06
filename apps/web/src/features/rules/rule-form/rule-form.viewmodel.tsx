import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';
import { useRef, useState } from 'react';

import type { RulePreviewStatus } from '#/features/rules/rule-form/types/rule-preview-status.type.ts';
import { INVALID_FIELD_OR_STAND_IN_SELECTOR } from '#/shared/constants/form/invalid-field-selector.constant.ts';
import { useFocusFirstInvalid } from '#/shared/hooks/form/use-focus-first-invalid.hook.ts';
import { useDebouncedValue } from '#/features/rules/hooks/use-debounced-value.hook.ts';
import { useRuleFormModel } from '#/features/rules/rule-form/rule-form.model.ts';
import type {
  AccountOption,
  RuleFormErrors,
  RuleFormOutcome,
  RuleFormTarget,
  RuleTextMode,
  TagOption,
} from '#/features/rules/types/rule-form.type.ts';
import { buildCategoryGroups } from '#/features/rules/utils/build-category-groups.util.ts';
import { buildPreviewBody } from '#/features/rules/rule-form/utils/build-preview-body.util.ts';
import { buildRuleUpdateBody } from '#/features/rules/rule-form/utils/build-rule-update-body.util.ts';
import { getRuleTextMode } from '#/features/rules/rule-form/utils/get-rule-text-mode.util.ts';
import { validateRuleForm } from '#/features/rules/rule-form/utils/validate-rule-form.util.ts';
import { buildHistoryLabel } from '#/features/rules/utils/build-history-label.util.ts';
import { buildHistoryChanges } from '#/features/rules/utils/build-history-changes.util.ts';
import { buildRulePreview } from '#/features/rules/utils/build-rule-preview.util.ts';
import { describeRuleError } from '#/features/rules/utils/describe-rule-error.util.ts';

const PREVIEW_DELAY_MS = 300;

type Options = {
  target: RuleFormTarget;
  onClose: () => void;
  onSaved: (outcome: RuleFormOutcome) => void;
  /** Edit only: the screen deletes the rule with its undo toast. */
  onDelete?: (rule: Rule.Dto) => void;
};

/**
 * State and submit of the rule modal: the sentence (text, category, tags), the live preview, the
 * "apply to the history" option with its confirmation, and the save. Mounted per target.
 */
export function useRuleFormViewModel({ target, onClose, onSaved, onDelete }: Options) {
  const editing = target.mode === 'edit' ? target.rule : null;

  const initialCounterparty = target.mode === 'create' ? (target.counterparty ?? '') : '';
  const [textMode, setTextMode] = useState<RuleTextMode>(
    editing ? getRuleTextMode(editing) : initialCounterparty ? 'counterparty' : 'description',
  );
  const [description, setDescription] = useState(editing?.descriptionContains ?? '');
  const [counterparty, setCounterparty] = useState(
    editing?.counterpartyContains ?? initialCounterparty,
  );
  const [accountId, setAccountId] = useState<string | null>(editing?.accountId ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(editing?.categoryId ?? null);
  const [tagIds, setTagIds] = useState<string[]>(editing?.tagIds ?? []);
  const [applyToHistory, setApplyToHistory] = useState(false);
  const [errors, setErrors] = useState<RuleFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [focusToken, setFocusToken] = useState(0);
  const formRef = useRef<HTMLDivElement>(null);
  useFocusFirstInvalid({
    attempt: focusToken,
    selector: INVALID_FIELD_OR_STAND_IN_SELECTOR,
    scope: formRef,
  });

  const debouncedDescription = useDebouncedValue(description, PREVIEW_DELAY_MS);
  const debouncedCounterparty = useDebouncedValue(counterparty, PREVIEW_DELAY_MS);
  const previewBody = buildPreviewBody(
    {
      mode: textMode,
      description: debouncedDescription,
      counterparty: debouncedCounterparty,
      accountId,
      categoryId,
      tagIds,
    },
    editing,
  );
  const model = useRuleFormModel(previewBody);

  const allCategories = model.categories.data?.items ?? [];
  const categoryGroups = buildCategoryGroups(allCategories, {
    kind: editing?.kind ?? null,
    selectedId: categoryId,
  });
  const tagOptions: TagOption[] = (model.tags.data?.items ?? [])
    .filter((tag) => tag.archivedAt === null || tagIds.includes(tag.id))
    .map((tag) => ({ id: tag.id, name: tag.name }));
  const accountOptions: AccountOption[] = (model.accounts.data?.items ?? [])
    .filter((account) => account.archivedAt === null || account.id === accountId)
    .map((account) => ({ id: account.id, name: account.name }));
  const categoryName = allCategories.find((item) => item.id === categoryId)?.name ?? null;
  const nameOf = (id: string | null) =>
    allCategories.find((item) => item.id === id)?.name ?? 'Sem categoria';

  const preview = model.preview.data;
  const hasAction = categoryId !== null || tagIds.length > 0;
  const willChange = preview?.willChangeCount ?? 0;
  const isSaving = model.create.isPending || model.update.isPending || model.apply.isPending;

  // Saves, closes the modal and only then tells the screen, so the undo toast is not hidden behind
  // the modal that is still open.
  async function commit() {
    setSubmitError(null);
    try {
      let outcome: RuleFormOutcome | null;

      if (editing) {
        const body = buildRuleUpdateBody(editing, {
          mode: textMode,
          description,
          counterparty,
          accountId,
          categoryId,
          tagIds,
        });
        const changed = Object.keys(body).length > 0;
        const rule = changed ? await model.update.mutateAsync({ id: editing.id, body }) : editing;
        const applied = applyToHistory ? await model.apply.mutateAsync(rule.id) : null;
        outcome = changed || applied ? { rule, applied, created: false, categoryName } : null;
      } else {
        const result = await model.create.mutateAsync({
          ...(textMode !== 'counterparty' ? { descriptionContains: description } : {}),
          ...(textMode !== 'description' ? { counterpartyContains: counterparty } : {}),
          ...(accountId ? { accountId } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(tagIds.length > 0 ? { tagIds } : {}),
          ...(applyToHistory ? { applyToHistory: true } : {}),
        });
        outcome = { rule: result.rule, applied: result.applied, created: true, categoryName };
      }

      onClose();
      if (outcome) onSaved(outcome);
    } catch (error) {
      setIsConfirming(false);
      setSubmitError(describeRuleError(error));
    }
  }

  function submit() {
    const result = validateRuleForm({
      mode: textMode,
      description,
      counterparty,
      accountId,
      categoryId,
      tagIds,
    });
    if (!result.ok) {
      setErrors(result.errors);
      setFocusToken((token) => token + 1);
      return;
    }
    setErrors({});

    if (applyToHistory && willChange > 0) {
      setIsConfirming(true);
      return;
    }
    void commit();
  }

  const previewStatus: RulePreviewStatus = !previewBody
    ? 'idle'
    : model.preview.isError
      ? 'error'
      : model.preview.isLoading || !preview
        ? 'loading'
        : preview.matchCount === 0
          ? 'empty'
          : 'ready';

  return {
    formRef,
    title: editing ? 'Editar regra' : 'Nova regra',
    subtitle: editing
      ? 'Editar não muda as transações que já passaram pela regra.'
      : 'Quando a transação bater, ela ganha a categoria e as tags.',
    submitLabel: editing ? 'Salvar regra' : 'Criar regra',

    textMode,
    onTextModeChange: setTextMode,
    description,
    onDescriptionChange: setDescription,
    counterparty,
    onCounterpartyChange: setCounterparty,
    accountId,
    accounts: accountOptions,
    onAccountChange: setAccountId,
    categoryId,
    categoryGroups,
    onCategoryChange: setCategoryId,
    tagOptions,
    tagIds,
    onTagIdsChange: setTagIds,
    errors,
    submitError,

    previewStatus,
    preview: preview ? buildRulePreview(preview) : undefined,
    onRetryPreview: () => void model.preview.refetch(),

    historyOption:
      preview && hasAction && willChange > 0
        ? {
            label: buildHistoryLabel(willChange),
            hint: 'Recategoriza o histórico; edições feitas à mão não mudam.',
            checked: applyToHistory,
            onChange: setApplyToHistory,
          }
        : null,

    isSaving,
    isConfirming,
    confirmDialog: {
      title: 'Aplicar a regra no histórico?',
      description: 'Dá para desfazer logo depois, pelo aviso na base da tela.',
      changes: buildHistoryChanges({
        willChangeCount: willChange,
        examples: preview?.examples ?? [],
        categoryName,
        tagNames: tagOptions.filter((tag) => tagIds.includes(tag.id)).map((tag) => tag.name),
        nameOf,
      }),
      confirmLabel: `Aplicar em ${willChange}`,
      onConfirm: () => void commit(),
      onCancel: () => setIsConfirming(false),
    },

    onDelete: editing && onDelete ? () => onDelete(editing) : null,
    onSubmit: submit,
    onClose,
  };
}
