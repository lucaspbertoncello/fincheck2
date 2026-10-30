const withCents = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const wholeReais = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/** Integer cents to the number part of a BRL amount, without sign: 123456 -> "1.234,56". */
export function formatMoneyParts(cents: number, showCents = true): string {
  const reais = Math.abs(cents) / 100;
  return showCents ? withCents.format(reais) : wholeReais.format(reais);
}
