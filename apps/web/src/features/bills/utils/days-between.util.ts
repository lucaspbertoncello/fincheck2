const DAY_MS = 86_400_000;

/** Whole days from `from` to `to` (both `YYYY-MM-DD`); negative when `to` is before `from`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}
