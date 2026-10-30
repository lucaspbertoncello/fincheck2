import { describe, expect, it } from 'vitest';

import { BANK_THEMES, resolveBankThemeKey } from '#/components/bank-cards/index.ts';

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

describe('bank themes', () => {
  it('has the 10 banks, 2 variants and the fallback', () => {
    expect(Object.keys(BANK_THEMES)).toHaveLength(13);
    expect(BANK_THEMES.fallback.mark).toBeNull();
  });

  it('keeps the text at 4.5:1 or more against every point of the gradient', () => {
    for (const theme of Object.values(BANK_THEMES)) {
      for (const stop of theme.gradient.stops) {
        expect(contrast(theme.text, stop), `${theme.key} ${stop}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('resolves a bank id to its theme and any other bank to the fallback', () => {
    expect(resolveBankThemeKey('nubank')).toBe('nubank');
    expect(resolveBankThemeKey('mercado-pago')).toBe('mercado-pago');
    expect(resolveBankThemeKey('sicredi')).toBe('fallback');
    expect(resolveBankThemeKey(null)).toBe('fallback');
  });
});
