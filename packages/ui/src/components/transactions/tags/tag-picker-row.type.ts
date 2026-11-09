/** A tag the picker can show: its id and name. */
export type TagPickerOption = { id: string; name: string };

/** One line of the picker list: an existing tag (marked or not) or the "Criar tag" line. */
export type TagPickerRow =
  { kind: 'tag'; id: string; name: string; selected: boolean } | { kind: 'create'; name: string };
