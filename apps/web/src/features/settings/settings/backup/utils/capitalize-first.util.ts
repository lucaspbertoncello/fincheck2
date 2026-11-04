/** "ontem às 03:00" becomes "Ontem às 03:00". */
export function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
