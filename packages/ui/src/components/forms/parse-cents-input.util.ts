/** 12 digits keep the amount well inside the safe integer range (R$ 9.999.999.999,99). */
const MAX_DIGITS = 12;

/** Text typed in a money field to integer cents: only the digits count ("1.234,5" -> 12345). */
export function parseCentsInput(text: string): number {
  const digits = text.replace(/\D/g, '').slice(0, MAX_DIGITS);
  return digits ? Number(digits) : 0;
}
