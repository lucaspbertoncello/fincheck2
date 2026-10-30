import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

/** What turns an occurrence into a row: the lookups of the screen and the moment. */
export type RowContext = {
  recurrences: ReadonlyMap<string, Recurrence.Dto>;
  /** Category id -> icon name of the category set. */
  categoryIcons: ReadonlyMap<string, string>;
  /** Account id -> name. */
  accountNames: ReadonlyMap<string, string>;
  today: string;
  hidden: boolean;
  /** Id (occurrence or recurrence) whose mutation is running. */
  pendingKey: string | null;
};
