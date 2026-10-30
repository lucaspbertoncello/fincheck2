import { maskMoneyText } from '@fincheck/ui';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NO_BREAK_SPACE = String.fromCharCode(160);

/**
 * Money inside a plain-text subtitle. With "hide values" on it never prints the number: the
 * digits become dots and the shape stays ("R$ •••,••"), so the line keeps its size.
 */
export function formatMoneyText(cents: number, isHidden: boolean): string {
  const text = brl.format(cents / 100).replaceAll(NO_BREAK_SPACE, ' ');
  return isHidden ? maskMoneyText(text).replace('-', '') : text;
}
