const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formats integer cents as BRL, e.g. 123456 -> "R$ 1.234,56". */
export function formatMoney(cents: number): string {
  return brl.format(cents / 100);
}
