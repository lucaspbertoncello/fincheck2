/** "Aplicar também nessas 14 transações": the option that sends the rule over the history. */
export function buildHistoryLabel(willChangeCount: number): string {
  return willChangeCount === 1
    ? 'Aplicar também nessa transação'
    : `Aplicar também nessas ${willChangeCount} transações`;
}
