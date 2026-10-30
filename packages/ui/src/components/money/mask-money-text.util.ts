/**
 * Hides the digits of an amount written as text and keeps its shape: "R$ 1.234,56" becomes
 * "R$ •.•••,••". For plain strings (tooltips, axis ticks, sentences) where a component cannot be
 * used; in the screen the `Money` component masks with `MaskedNumber`, which keeps the exact width.
 */
export function maskMoneyText(text: string): string {
  return text.replace(/\d/g, '•');
}
