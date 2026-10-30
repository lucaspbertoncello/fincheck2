import type { CSSProperties } from 'react';

import { BANK_THEMES } from '#/components/bank-cards/bank-themes.constant.ts';
import type { BankThemeKey } from '#/components/bank-cards/bank-theme.type.ts';
import { cx } from '#/utils/class-names.util.ts';

type BankCardMiniProps = {
  theme: BankThemeKey;
  className?: string;
};

/** Mini card (40 × 26, radius 4) of the lists, in the theme of the bank (components.md 3.3). */
export function BankCardMini({ theme: themeKey, className }: BankCardMiniProps) {
  const theme = BANK_THEMES[themeKey];
  const [from, mid, to] = theme.gradient.stops;
  const style: CSSProperties = {
    background: `${theme.art},linear-gradient(${theme.gradient.angle},${from},${mid} 55%,${to})`,
  };
  return (
    <span
      aria-hidden="true"
      className={cx('block h-6.5 w-10 shrink-0 overflow-hidden rounded-tiny', className)}
      style={style}
    />
  );
}
