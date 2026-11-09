import { businessDateOfInstant } from '#/shared/date/business-date-of-instant.util.ts';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
// Midnight UTC exactly is how the banks send "a day without hour": the day is the text itself.
const MIDNIGHT_UTC = /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.0+)?(?:Z|\+00:00)$/;
const HAS_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/;

// The business date (`YYYY-MM-DD`, America/Sao_Paulo) of a date of the Pluggy; null when the text
// is not a date. Midnight UTC keeps its own day (converting it would slip it back a day); any
// other hour is an instant, and the business date is the one it falls on in Sao Paulo.
export function translatePluggyDate(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();

  if (DATE_ONLY.test(text)) return text;
  const midnight = MIDNIGHT_UTC.exec(text);

  if (midnight) return midnight[1] ?? null;
  // A time with no zone is read as UTC, like the Pluggy sends it, not as the zone of this PC.
  const instant = Date.parse(HAS_ZONE.test(text) ? text : `${text}Z`);

  if (Number.isNaN(instant)) return null;

  return businessDateOfInstant(instant).value;
}
