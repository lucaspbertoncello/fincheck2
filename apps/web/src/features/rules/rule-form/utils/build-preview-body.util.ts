import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import type { Rule } from '@fincheck/shared/categories/rule/rule.type.ts';

type PreviewValues = {
  description: string;
  accountId: string | null;
  categoryId: string | null;
  tagIds: readonly string[];
};

/**
 * The body of `POST /rules/preview`, or null while the text is too short to ask (the contract wants
 * 2 characters after normalizing). When editing, the conditions the modal does not show (type and
 * amounts) go along, so the preview counts what the saved rule would.
 */
export function buildPreviewBody(
  values: PreviewValues,
  editing: Rule.Dto | null,
): Rule.PreviewRequest | null {
  if (normalizeText(values.description).length < 2) return null;

  const body: Rule.PreviewRequest = { descriptionContains: values.description };
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
