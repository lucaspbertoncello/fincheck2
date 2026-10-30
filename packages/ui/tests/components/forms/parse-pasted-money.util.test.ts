import { describe, expect, it } from 'vitest';

import { parsePastedMoney } from '#/components/forms/parse-pasted-money.util.ts';

describe('parsePastedMoney', () => {
  it('reads a pt-BR amount with currency and thousands', () => {
    expect(parsePastedMoney('R$ 1.234,56')).toBe(123456);
    expect(parsePastedMoney('R$1.234,56')).toBe(123456);
  });

  it('reads an en-US amount', () => {
    expect(parsePastedMoney('1,234.56')).toBe(123456);
    expect(parsePastedMoney('$ 99.9')).toBe(9990);
  });

  it('pads one decimal digit and keeps two', () => {
    expect(parsePastedMoney('12,5')).toBe(1250);
    expect(parsePastedMoney('0,05')).toBe(5);
    expect(parsePastedMoney('1234,5')).toBe(123450);
  });

  it('reads a number without a separator as whole reais', () => {
    expect(parsePastedMoney('1234')).toBe(123400);
    expect(parsePastedMoney('10')).toBe(1000);
  });

  it('reads a thousands dot with three digits as thousands, not cents', () => {
    expect(parsePastedMoney('1.234')).toBe(123400);
    expect(parsePastedMoney('12.345.678')).toBe(1234567800);
  });

  it('ignores a minus sign and spaces: the sign is chosen elsewhere', () => {
    expect(parsePastedMoney('-R$ 50,00')).toBe(5000);
    expect(parsePastedMoney('  50 , 00 ')).toBe(5000);
  });

  it('gives zero for text without digits', () => {
    expect(parsePastedMoney('')).toBe(0);
    expect(parsePastedMoney('abc')).toBe(0);
  });

  it('caps at the 12-digit ceiling of the typed entry', () => {
    expect(parsePastedMoney('99999999999999')).toBe(999_999_999_999);
  });
});
