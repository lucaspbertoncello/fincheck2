import type { CSSProperties } from 'react';

import { BankCardChip } from '#/components/bank-cards/bank-card-chip.component.tsx';
import {
  BANK_CARD_GRAIN,
  BANK_CARD_METAL_LINES,
  BANK_NETWORK_LABEL,
} from '#/components/bank-cards/bank-card-grain.constant.ts';
import { getBankCardLayout } from '#/components/bank-cards/bank-card-layout.util.ts';
import { BankCardMark } from '#/components/bank-cards/bank-card-mark.component.tsx';
import { BankCardNetwork } from '#/components/bank-cards/bank-card-network.component.tsx';
import { followPointer } from '#/components/bank-cards/follow-pointer.util.ts';
import { resetPointer } from '#/components/bank-cards/reset-pointer.util.ts';
import { BANK_THEMES } from '#/components/bank-cards/bank-themes.constant.ts';
import type { BankThemeKey } from '#/components/bank-cards/bank-theme.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type BankCardProps = {
  theme: BankThemeKey;
  /** Name of the card in the bank ("Roxinho"). */
  nickname: string;
  /** Last four digits. */
  last4: string;
  /** "Vence dia 06". */
  dueLabel: string;
  /** Bank name: read by screen readers and written on the card by the fallback theme. */
  bankName?: string;
  /** Main color of the bank, drawn as a stripe on the fallback theme ("#3FA110"). */
  stripeColor?: string;
  /** Tilts with the pointer (fine pointer and motion allowed only). On by default. */
  tilt?: boolean;
  className?: string;
};

/**
 * Credit card visual, 85.6 × 54 mm, themed per bank (components.md 3.3). Every inner measure
 * is in cqw so the card scales with its width. The whole card is one image for screen readers.
 */
export function BankCard({
  theme: themeKey,
  nickname,
  last4,
  dueLabel,
  bankName,
  stripeColor,
  tilt = true,
  className,
}: BankCardProps) {
  const theme = BANK_THEMES[themeKey];
  const layout = getBankCardLayout(theme.markCorner, theme.networkTop);
  const [from, mid, to] = theme.gradient.stops;
  const name = bankName ?? theme.name;
  const label = `Cartão ${name}, ${nickname}, final ${last4}, ${dueLabel}, ${BANK_NETWORK_LABEL[theme.network]}`;

  const cardStyle: CSSProperties = {
    aspectRatio: '85.6 / 53.98',
    color: theme.text,
    background: `${theme.art},linear-gradient(${theme.gradient.angle},${from},${mid} 55%,${to})`,
    boxShadow: 'var(--shadow-bank-card)',
    transform:
      'perspective(900px) rotateX(calc(var(--py,0) * -6deg)) rotateY(calc(var(--px,0) * 8deg))',
    transition: 'transform var(--duration-slow) var(--ease-standard)',
  };
  const glossLight = `radial-gradient(circle at var(--lx,25%) var(--ly,0%),oklch(1 0 0 / ${theme.gloss}),transparent 55%)`;

  return (
    <div
      role="img"
      aria-label={label}
      onPointerMove={tilt ? followPointer : undefined}
      onPointerLeave={tilt ? resetPointer : undefined}
      className={cx(
        '@container relative w-full max-w-full overflow-hidden rounded-panel',
        className,
      )}
      style={cardStyle}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{ backgroundImage: BANK_CARD_GRAIN, opacity: theme.noise }}
      />
      {themeKey === 'fallback' && stripeColor ? (
        <span
          aria-hidden="true"
          className="absolute top-0 bottom-0"
          style={{ right: '22cqw', width: '5cqw', background: stripeColor }}
        />
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-1 grid"
        style={{
          padding: '7cqw 7cqw 6cqw',
          columnGap: '4cqw',
          gridTemplateColumns: '1fr auto',
          gridTemplateRows: 'auto 1fr auto',
          gridTemplateAreas: layout.areas,
          fontFamily: 'var(--font-family-title)',
        }}
      >
        <div className="flex min-w-0 leading-none" style={{ ...layout.bn, gap: '1.5cqw' }}>
          <BankCardMark theme={theme} fallbackName={name} />
          <span
            className="block"
            style={{
              fontSize: 'max(12px, 3.8cqw)',
              color: theme.textSecondary,
            }}
          >
            {nickname}
          </span>
        </div>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          focusable="false"
          style={{ ...layout.nfc, width: '6cqw', height: '6cqw', opacity: 0.85 }}
        >
          <path d="M8 8.5a5 5 0 0 1 0 7M11.5 6a9 9 0 0 1 0 12M15 3.5a13 13 0 0 1 0 17" />
        </svg>
        <div className="flex items-center" style={{ gridArea: 'chip' }}>
          <BankCardChip finish={theme.chip} />
        </div>
        <div className="min-w-0" style={layout.data}>
          <div
            className="font-money"
            style={{
              fontSize: '4.6cqw',
              letterSpacing: '0.08em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            •••• {last4}
          </div>
          <div
            style={{ fontSize: 'max(12px, 3.4cqw)', color: theme.textSecondary, marginTop: '1cqw' }}
          >
            {dueLabel}
          </div>
        </div>
        <div style={layout.net}>
          <BankCardNetwork network={theme.network} />
        </div>
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-2"
        style={{
          background: theme.metal ? `${glossLight},${BANK_CARD_METAL_LINES}` : glossLight,
        }}
      />
    </div>
  );
}
