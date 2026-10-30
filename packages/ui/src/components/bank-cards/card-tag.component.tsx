import { cx } from '#/utils/class-names.util.ts';

const TONE_CLASS = {
  accent: 'bg-brand-weak text-brand',
  neutral: 'bg-subtle text-fg-secondary',
  income: 'bg-gain-weak text-gain',
} as const;

type CardTagProps = {
  tone: keyof typeof TONE_CLASS;
  children: string;
};

/**
 * Small status tag of the bank cards ("Fatura aberta", "Pluggy", "Manual"). Local stand-in until
 * the shared chip of `chips/` is wired in.
 */
export function CardTag({ tone, children }: CardTagProps) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center rounded-capsule px-s12 py-s4 text-meta',
        TONE_CLASS[tone],
      )}
    >
      {children}
    </span>
  );
}
