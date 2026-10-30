/** `2026-10-12` -> `12/10`: the short day of the "Dia 12/10" chip. */
export function formatDayChip(businessDate: string): string {
  const [, month = '', day = ''] = businessDate.split('-');
  return `${day}/${month}`;
}
