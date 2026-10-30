// A repeatable number from 0 (included) to 1 (excluded) for any integer: same input, same output,
// no randomness. Used to make the made-up history look uneven without changing between runs.
export function hashUnit(seed: number): number {
  let value = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  value ^= value >>> 16;

  return (value >>> 0) / 4_294_967_296;
}
