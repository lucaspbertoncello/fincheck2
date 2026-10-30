const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NO_BREAK_SPACE = String.fromCharCode(160);

/** Money inside a plain-text subtitle. With "hide values" on it never prints the number. */
export function formatMoneyText(cents: number, isHidden: boolean): string {
  return isHidden ? 'R$ ••••' : brl.format(cents / 100).replaceAll(NO_BREAK_SPACE, ' ');
}
