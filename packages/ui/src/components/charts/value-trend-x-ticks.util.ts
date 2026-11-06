/** Keys of the points that get a label under the axis: about five, first and last always in. */
export function valueTrendXTicks(keys: readonly string[], wanted = 5): string[] {
  if (keys.length <= wanted) return [...keys];
  const last = keys.length - 1;
  const indexes = Array.from({ length: wanted }, (_, slot) =>
    Math.round((slot * last) / (wanted - 1)),
  );

  return [...new Set(indexes)].map((index) => keys[index]!);
}
