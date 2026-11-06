// A number with at least `length` digits, zero padded (`padNumber(3, 2)` is `03`).
export function padNumber(value: number, length: number): string {
  return String(value).padStart(length, '0');
}
