/** Path plus the `month` param, so the selected month follows the person to every screen. */
export function buildHref(path: string, month: string | undefined): string {
  return month ? `${path}?month=${month}` : path;
}
