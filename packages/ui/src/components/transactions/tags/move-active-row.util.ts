/** The active line after an arrow key: wraps around; none (-1) goes to the first or the last. */
export function moveActiveRow(current: number, step: 1 | -1, count: number): number {
  if (count === 0) return -1;
  if (current < 0) return step === 1 ? 0 : count - 1;

  return (current + step + count) % count;
}
