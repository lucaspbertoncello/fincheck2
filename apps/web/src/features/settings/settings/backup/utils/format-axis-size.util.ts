const axisFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

/** "2,2 MB": an axis label of a size already in megabytes. */
export function formatAxisSize(megabytes: number): string {
  return `${axisFormat.format(megabytes)} MB`;
}
