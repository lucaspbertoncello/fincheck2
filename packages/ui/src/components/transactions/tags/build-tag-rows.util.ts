import { foldTagText } from '#/components/transactions/tags/fold-tag-text.util.ts';
import type {
  TagPickerOption,
  TagPickerRow,
} from '#/components/transactions/tags/tag-picker-row.type.ts';

/**
 * The lines for what was typed: the tags whose name contains the text (no difference for case or
 * accent), in the order given, and, when the text matches no name exactly, the line that creates
 * it. An empty text lists every tag and offers nothing to create.
 */
export function buildTagRows(
  options: readonly TagPickerOption[],
  selectedIds: readonly string[],
  query: string,
): TagPickerRow[] {
  const wanted = foldTagText(query);
  const rows: TagPickerRow[] = options
    .filter((option) => wanted === '' || foldTagText(option.name).includes(wanted))
    .map((option) => ({
      kind: 'tag',
      id: option.id,
      name: option.name,
      selected: selectedIds.includes(option.id),
    }));
  const typed = query.trim();
  const exists = options.some((option) => foldTagText(option.name) === wanted);
  if (typed !== '' && !exists) rows.push({ kind: 'create', name: typed });

  return rows;
}
