import { Icon } from '#/components/icons/icon.component.tsx';
import { BANK_MARK_ART, type BankMarkArt } from '#/components/bank-cards/bank-mark-art.constant.ts';
import { BANK_THEMES } from '#/components/bank-cards/bank-themes.constant.ts';
import type { BankThemeKey } from '#/components/bank-cards/bank-theme.type.ts';
import { cx } from '#/utils/class-names.util.ts';

const SIZE_CLASS = {
  24: 'size-6',
  36: 'size-9',
  40: 'size-10',
  48: 'size-12',
  64: 'size-16',
} as const;

export type BankAvatarSize = keyof typeof SIZE_CLASS;

type BankAvatarProps = {
  /** A bank theme, or "wallet" for the manual wallet. */
  theme: BankThemeKey | 'wallet';
  /** Name of the bank, whose initial the fallback theme writes. */
  name?: string;
  size?: BankAvatarSize;
  className?: string;
};

/** Bank mark in a circle for lists (components.md 3.3); the wallet is an icon on a subtle ground. */
export function BankAvatar({ theme: themeKey, name = '', size = 36, className }: BankAvatarProps) {
  const base = cx('grid shrink-0 place-items-center rounded-capsule', SIZE_CLASS[size], className);

  if (themeKey === 'wallet') {
    return (
      <span
        aria-hidden="true"
        className={cx(base, 'border border-line bg-subtle text-fg-secondary')}
      >
        <Icon name="wallet" size={size >= 48 ? 'lg' : 'base'} />
      </span>
    );
  }

  const theme = BANK_THEMES[themeKey];

  if (!theme.mark) {
    const ground = theme.gradient.stops[1];
    return (
      <span
        aria-hidden="true"
        className={cx(base, 'font-title text-label font-heading')}
        style={{ background: ground, color: theme.text }}
      >
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }

  const full: BankMarkArt = BANK_MARK_ART[theme.mark.art];
  // Wide wordmarks turn to blur in a small circle: marks with a low-detail version use it there.
  const art = full.small ?? full;
  const ground = theme.gradient.stops[full.small?.groundStop ?? 1];
  return (
    <span
      aria-hidden="true"
      className={base}
      style={{ background: ground, color: theme.mark.color }}
    >
      <svg
        viewBox={art.viewBox}
        focusable="false"
        fill="currentColor"
        className={cx(full.small ? 'overflow-hidden' : 'overflow-visible h-1/2 w-3/5')}
        style={
          full.small ? { width: `${full.small.fit}%`, height: `${full.small.fit}%` } : undefined
        }
        dangerouslySetInnerHTML={{ __html: art.markup }}
      />
    </span>
  );
}
