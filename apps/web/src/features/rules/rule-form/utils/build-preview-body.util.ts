import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';

import type { RuleTextMode } from '#/features/rules/rule-form/types/rule-form.type.ts';

type PreviewValues = {
  mode: RuleTextMode;
  description: string;
  counterparty: string;
  accountId: string | null;
  categoryId: string | null;
  tagIds: readonly string[];
};

/**
 * The body of `POST /rules/preview`, or null while a text the rule uses is too short to ask (the
 * contract wants 2 characters after normalizing; with both conditions, both are needed or the count
 * would be larger than what the rule catches). When editing, the conditions the modal does not show
 * (type and amounts) go along, so the preview counts what the saved rule would.
 */
export function buildPreviewBody(
  values: PreviewValues,
  editing: Rule.Dto | null,
): Rule.PreviewRequest | null {
  const usesDescription = values.mode !== 'counterparty';
  const usesCounterparty = values.mode !== 'description';
  if (usesDescription && normalizeText(values.description).length < 2) return null;
  if (usesCounterparty && normalizeText(values.counterparty).length < 2) return null;

  const body: Rule.PreviewRequest = {};
  if (usesDescription) body.descriptionContains = values.description;
  if (usesCounterparty) body.counterpartyContains = values.counterparty;
  if (values.accountId) body.accountId = values.accountId;
  if (values.categoryId) body.categoryId = values.categoryId;
  if (values.tagIds.length > 0) body.tagIds = [...values.tagIds];

  if (editing) {
    if (editing.kind) body.kind = editing.kind;
    if (editing.amountMinCents !== null) body.amountMinCents = editing.amountMinCents;
    if (editing.amountMaxCents !== null) body.amountMaxCents = editing.amountMaxCents;
  }
  return body;
}
