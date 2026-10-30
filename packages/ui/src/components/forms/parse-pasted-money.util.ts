/** Same ceiling as the typed entry: 12 digits, R$ 9.999.999.999,99. */
const MAX_CENTS = 999_999_999_999;

/**
 * Text pasted in an amount field to integer cents. A decimal separator followed by one or two
 * digits at the end is the cents ("R$ 1.234,56" and "1,234.56" -> 123456; "12,5" -> 1250). Without
 * one the number is whole reais ("1234" -> 123400; "1.234" is a pt-BR thousand -> 123400). Typing is
 * different on purpose: each digit shifts the cents ("1234" typed -> 12,34).
 */
export function parsePastedMoney(text: string): number {
  const cleaned = text.replace(/[^\d.,]/g, '');
  const decimal = /^([\d.,]*?)[.,](\d{1,2})$/.exec(cleaned);
  const cents = decimal
    ? Number(`${(decimal[1] ?? '').replace(/\D/g, '') || '0'}${(decimal[2] ?? '').padEnd(2, '0')}`)
    : Number(cleaned.replace(/\D/g, '') || '0') * 100;
  return Math.min(cents, MAX_CENTS);
}
