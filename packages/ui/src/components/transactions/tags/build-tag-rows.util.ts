import { foldText } from '#/utils/fold-text.util.ts';
import type {
  TagPickerOption,
  TagPickerRow,
} from '#/components/transactions/tags/tag-picker-row.type.ts';

/**
 * The lines for what was typed: the tags whose name contains the text (no difference for case or
 * accent), in the order given, and, when the text matches no name exactly, the line that creates
 * it. An empty text lists every tag and ends in the fixed "Nova tag" line, which asks for the name;
 * a text that is already a tag offers nothing to create. `offersNew` false leaves the fixed line out.
 */
export function buildTagRows(
  options: readonly TagPickerOption[],
  selectedIds: readonly string[],
  query: string,
  offersNew = true,
): TagPickerRow[] {
  const wanted = foldText(query);
  const rows: TagPickerRow[] = options
    .filter((option) => wanted === '' || foldText(option.name).includes(wanted))
    .map((option) => ({
      kind: 'tag',
      id: option.id,
      name: option.name,
      selected: selectedIds.includes(option.id),
    }));
  const typed = query.trim();
  const exists = options.some((option) => foldText(option.name) === wanted);
  if (typed === '') {
    if (offersNew) rows.push({ kind: 'new' });
  } else if (!exists) rows.push({ kind: 'create', name: typed });

  return rows;
}
