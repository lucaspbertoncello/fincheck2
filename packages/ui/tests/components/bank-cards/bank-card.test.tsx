import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BANK_THEMES, BankAvatar, BankCard, BankCardMini } from '#/components/bank-cards/index.ts';
import type { BankThemeKey } from '#/components/bank-cards/index.ts';

const KEYS = Object.keys(BANK_THEMES) as BankThemeKey[];

describe('BankCard', () => {
  it('renders every theme as one image with the data of the card', () => {
    for (const key of KEYS) {
      const html = renderToStaticMarkup(
        <BankCard theme={key} nickname="Roxinho" last4="4821" dueLabel="Vence dia 06" />,
      );
      expect(html, key).toContain('role="img"');
      expect(html, key).toContain('final 4821');
      expect(html, key).toContain('Vence dia 06');
      expect(html, key).toContain('•••• 4821');
    }
  });

  it('names the network and the bank for screen readers', () => {
    const html = renderToStaticMarkup(
      <BankCard theme="nubank" nickname="Roxinho" last4="4821" dueLabel="Vence dia 06" />,
    );
    expect(html).toContain('Cartão Nubank, Roxinho, final 4821, Vence dia 06, Mastercard');
  });

  it('draws the aspect ratio of a credit card and the bank gradient', () => {
    const html = renderToStaticMarkup(
      <BankCard theme="bradesco" nickname="Elo" last4="7730" dueLabel="Vence dia 28" />,
    );
    expect(html).toContain('aspect-ratio:85.6 / 53.98');
    expect(html).toContain('#E01C3C');
  });

  it('puts the mark in the corner the theme asks for', () => {
    const topLeft = renderToStaticMarkup(
      <BankCard theme="bradesco" nickname="a" last4="1" dueLabel="b" />,
    );
    const bottomRight = renderToStaticMarkup(
      <BankCard theme="mercado-pago" nickname="a" last4="1" dueLabel="b" />,
    );
    expect(topLeft).toContain('&quot;bn nfc&quot;');
    expect(bottomRight).toContain('&quot;data net&quot;');
    expect(bottomRight).toContain('&quot;nfc bn&quot;');
  });

  it('writes the bank name and the stripe on the fallback theme', () => {
    const html = renderToStaticMarkup(
      <BankCard
        theme="fallback"
        bankName="Sicredi"
        stripeColor="#3FA110"
        nickname="Conta"
        last4="3840"
        dueLabel="Vence dia 22"
      />,
    );
    expect(html).toContain('>Sicredi<');
    expect(html).toContain('#3FA110');
    expect(html).toContain('Cartão Sicredi');
  });

  it('draws the Visa and Elo as text and the Mastercard as two circles', () => {
    const visa = renderToStaticMarkup(
      <BankCard theme="santander" nickname="a" last4="1" dueLabel="b" />,
    );
    const elo = renderToStaticMarkup(
      <BankCard theme="caixa" nickname="a" last4="1" dueLabel="b" />,
    );
    const mc = renderToStaticMarkup(<BankCard theme="inter" nickname="a" last4="1" dueLabel="b" />);
    expect(visa).toContain('VISA');
    expect(elo).toContain('>elo<');
    expect(mc).toContain('#EB001B');
    expect(mc).toContain('#F79E1B');
  });

  it('renders with the tilt off', () => {
    const html = renderToStaticMarkup(
      <BankCard theme="c6" nickname="a" last4="1" dueLabel="b" tilt={false} />,
    );
    expect(html).toContain('role="img"');
  });
});

describe('BankCardMini and BankAvatar', () => {
  it('draws the mini card in the gradient of the theme, hidden from screen readers', () => {
    const html = renderToStaticMarkup(<BankCardMini theme="nubank" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('#880FD6');
  });

  it('draws the bank mark in a circle, the wallet as an icon and the fallback as an initial', () => {
    expect(renderToStaticMarkup(<BankAvatar theme="nubank" />)).toContain('<svg');
    expect(renderToStaticMarkup(<BankAvatar theme="wallet" />)).toContain('<svg');
    expect(renderToStaticMarkup(<BankAvatar theme="fallback" name="sicredi" />)).toContain('>S<');
  });
});
