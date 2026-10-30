import { BANK_MARK_ART } from '#/components/bank-cards/bank-mark-art.constant.ts';
import type { BankTheme } from '#/components/bank-cards/bank-theme.type.ts';

type BankCardMarkProps = {
  theme: BankTheme;
  /** Bank name in text, used by the fallback theme (which has no mark). */
  fallbackName: string;
};

/** The bank mark of the card, in the color of the theme; the fallback writes the name in text. */
export function BankCardMark({ theme, fallbackName }: BankCardMarkProps) {
  if (!theme.mark) {
    return (
      <span
        className="font-title whitespace-nowrap"
        style={{ fontSize: '6.2cqw', fontWeight: 600, letterSpacing: '-0.03em' }}
      >
        {fallbackName}
      </span>
    );
  }
  const art = BANK_MARK_ART[theme.mark.art];
  return (
    <span
      className="flex items-center"
      style={{ height: theme.markHeight, gap: '2cqw', color: theme.mark.color }}
    >
      <svg
        viewBox={art.viewBox}
        aria-hidden="true"
        focusable="false"
        className="block h-full w-auto overflow-visible"
        dangerouslySetInnerHTML={{ __html: art.markup }}
      />
      {theme.mark.wordmarkText ? (
        <span
          className="font-title whitespace-nowrap"
          style={{ fontSize: '6.2cqw', fontWeight: 700, letterSpacing: '-0.04em' }}
        >
          {theme.mark.wordmarkText}
        </span>
      ) : null}
    </span>
  );
}
