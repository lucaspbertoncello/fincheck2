import { translatePluggyDate } from '#/modules/sync/infra/pluggy/translate-pluggy-date.util.ts';

// A date the contract cannot do without: a value that is not a date is a body that is not what
// was documented (the gateway turns this into `unavailable`).
export function requirePluggyDate(value: unknown): string {
  const date = translatePluggyDate(value);

  if (date === null) throw new TypeError('The date is not a date');

  return date;
}
