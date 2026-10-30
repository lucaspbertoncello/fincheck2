// The month (`YYYY-MM`) of a business date.
export function monthOf(date: string): string {
  return date.slice(0, 7);
}
