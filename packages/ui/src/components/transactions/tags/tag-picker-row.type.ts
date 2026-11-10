/** A tag the picker can show: its id and name. */
export type TagPickerOption = { id: string; name: string };

/**
 * One line of the picker list: an existing tag (marked or not), the "Criar tag" line for the typed
 * text, or the fixed "Nova tag" line that asks for a name (only while nothing is typed).
 */
export type TagPickerRow =
  | { kind: 'tag'; id: string; name: string; selected: boolean }
  | { kind: 'create'; name: string }
  | { kind: 'new' };
