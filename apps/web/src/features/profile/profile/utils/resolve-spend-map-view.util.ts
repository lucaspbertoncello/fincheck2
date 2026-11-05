/** "month" when the map covers one calendar month, "year" for anything longer (read from its ends). */
export function resolveSpendMapView(fromOn: string, untilOn: string): 'month' | 'year' {
  return fromOn.slice(0, 7) === untilOn.slice(0, 7) ? 'month' : 'year';
}
