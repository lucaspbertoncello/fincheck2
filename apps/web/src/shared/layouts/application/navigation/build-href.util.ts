/**
 * Path plus the `month` param, so the selected month follows the person to every screen.
 * The path may already carry a query (`/transactions?new=transaction`): the month is appended to it.
 */
export function buildHref(path: string, month: string | undefined): string {
  if (!month) return path;
  return `${path}${path.includes('?') ? '&' : '?'}month=${month}`;
}
