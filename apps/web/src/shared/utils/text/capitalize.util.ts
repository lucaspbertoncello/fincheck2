/** "ontem às 03:00" becomes "Ontem às 03:00". */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
