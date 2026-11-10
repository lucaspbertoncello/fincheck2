/** The line under the title: "2 em andamento · 1 quitada". */
export function describeInstallmentPlansSummary(activeCount: number, settledCount: number): string {
  if (activeCount === 0 && settledCount === 0) return 'Nenhuma compra parcelada ainda';

  return [
    activeCount > 0 ? `${activeCount} em andamento` : null,
    settledCount > 0 ? `${settledCount} ${settledCount === 1 ? 'quitada' : 'quitadas'}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ');
}
