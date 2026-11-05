const compactNumber = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** Axis label for a value in cents: "0", "500", "1,5 mil", "5 mil". */
export function formatAxisCents(cents: number): string {
  const reais = Math.round(cents / 100);
  return reais >= 1000 ? `${compactNumber.format(reais / 1000)} mil` : String(reais);
}
