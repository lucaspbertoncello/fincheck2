import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BANK_THEMES, BankAvatar, BankCard, BankCardMini } from '#/components/bank-cards/index.ts';
import type { BankThemeKey } from '#/components/bank-cards/index.ts';

const KEYS = Object.keys(BANK_THEMES) as BankThemeKey[];

describe('bank theme colors', () => {
  it('paints every card with the three gradient stops and the mark color of its theme', () => {
    for (const key of KEYS) {
      const theme = BANK_THEMES[key];
      const html = renderToStaticMarkup(
        <BankCard theme={key} nickname="a" last4="1" dueLabel="b" />,
      );
      const [from, mid, to] = theme.gradient.stops;
      expect(html, `${key} gradient`).toContain(
        `linear-gradient(${theme.gradient.angle},${from},${mid} 55%,${to})`,
      );
      if (theme.mark) {
        expect(html, `${key} mark`).toContain(`color:${theme.mark.color}`);
        expect(html, `${key} mark fill`).toContain('fill="currentColor"');
      }
    }
  });

  it('paints every mini card with the gradient of its theme', () => {
    for (const key of KEYS) {
      const [from, mid, to] = BANK_THEMES[key].gradient.stops;
      const html = renderToStaticMarkup(<BankCardMini theme={key} />);
      expect(html, key).toContain(`${from},${mid} 55%,${to}`);
    }
  });

  it('paints every avatar on the mid stop, with the mark color and a fill that is not black', () => {
    for (const key of KEYS) {
      const theme = BANK_THEMES[key];
      if (!theme.mark) continue;
      const html = renderToStaticMarkup(<BankAvatar theme={key} />);
      expect(html, `${key} ground`).toContain(`background:${theme.gradient.stops[1]}`);
      expect(html, `${key} mark`).toContain(`color:${theme.mark.color}`);
      expect(html, `${key} fill`).toContain('fill="currentColor"');
    }
  });

  it('draws the Nubank mark in white on the card and on the avatar', () => {
    expect(BANK_THEMES.nubank.mark?.color).toBe('#FFFFFF');
    const card = renderToStaticMarkup(
      <BankCard theme="nubank" nickname="Roxinho" last4="4821" dueLabel="b" />,
    );
    const avatar = renderToStaticMarkup(<BankAvatar theme="nubank" />);
    expect(card).toContain('color:#FFFFFF');
    expect(avatar).toContain('color:#FFFFFF');
    expect(avatar).toContain('fill="currentColor"');
  });
});
