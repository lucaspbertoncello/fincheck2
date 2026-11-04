import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  BANK_MARK_ART,
  type BankMarkArt,
  type BankMarkId,
} from '#/components/bank-cards/bank-mark-art.constant.ts';
import { BANK_THEMES, BankAvatar } from '#/components/bank-cards/index.ts';

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

describe('bank avatar small mark', () => {
  it('draws the Bradesco tree symbol, not the wide wordmark, in the circle', () => {
    const small = BANK_MARK_ART.bradesco.small;
    expect(small.viewBox).toBe('0 0 24.1 23.1');
    for (const size of [24, 36, 40, 48, 64] as const) {
      const html = renderToStaticMarkup(<BankAvatar theme="bradesco" size={size} />);
      expect(html).toContain(`viewBox="${small.viewBox}"`);
      expect(html).not.toContain(`viewBox="${BANK_MARK_ART.bradesco.viewBox}"`);
      expect(html).toContain(`width:${small.fit}%`);
    }
  });

  it('keeps every small mark at 3:1 or more against the circle ground, in every theme', () => {
    const withSmall = new Set(
      (Object.keys(BANK_MARK_ART) as BankMarkId[]).filter((id) => 'small' in BANK_MARK_ART[id]),
    );
    expect([...withSmall].sort()).toEqual(['bradesco', 'c6', 'caixa', 'inter', 'santander']);
    for (const theme of Object.values(BANK_THEMES)) {
      if (!theme.mark || !withSmall.has(theme.mark.art)) continue;
      const art: BankMarkArt = BANK_MARK_ART[theme.mark.art];
      const ground = theme.gradient.stops[art.small?.groundStop ?? 1];
      expect(contrast(theme.mark.color, ground), theme.key).toBeGreaterThanOrEqual(3);
      expect(art.small?.markup, `${theme.key} stays one color`).not.toMatch(/fill="#/);
    }
  });

  it('keeps the full art on the other marks', () => {
    const html = renderToStaticMarkup(<BankAvatar theme="nubank" />);
    expect(html).toContain(`viewBox="${BANK_MARK_ART.nubank.viewBox}"`);
    expect(html).toContain('h-1/2 w-3/5');
  });
});
