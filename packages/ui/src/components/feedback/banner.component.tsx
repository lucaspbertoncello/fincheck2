import type { ReactNode } from 'react';

import { Button } from '#/components/buttons/index.ts';
import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';
import { cx } from '#/utils/class-names.util.ts';
import type { BannerVariant } from '#/components/feedback/banner.type.ts';

const VARIANT = {
  /** Old data, review notice. */
  warning: { box: 'bg-caution-weak', icon: 'text-caution', name: 'warning' },
  /** "Não deu para sincronizar o Bradesco". */
  error: { box: 'bg-loss-weak', icon: 'text-loss', name: 'danger' },
  /** "Criar regra". */
  suggestion: { box: 'bg-brand-weak', icon: 'text-brand', name: 'magic' },
} as const satisfies Record<BannerVariant, { box: string; icon: string; name: IconName }>;

type BannerProps = {
  variant: BannerVariant;
  /** Replaces the variant icon at the left (the logo of a service). */
  mark?: ReactNode;
  /** 16 px message. */
  title: string;
  /** 14 px line under it: the reason, the time of the attempts. */
  description?: ReactNode;
  /** Button on the right (below the text, full width, on the phone). */
  actionLabel?: string;
  onAction?: () => void;
  /** Second, quieter button beside the first ("Agora não"). */
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  /**
   * Where the buttons go: "end" (default) at the right, full width on the phone; "below" in a strip
   * under the text, aligned with it and never stretched.
   */
  actionsPlacement?: 'end' | 'below';
  /** The action button spins and stops answering. */
  actionLoading?: boolean;
  className?: string;
};

/**
 * Banner (components.md 13.4): warning, error or suggestion. Never a strip of alarm at the top of
 * the Visão geral; the day's exception there is `InlineNotice`. The error variant is an `alert`,
 * the others a `status`.
 */
export function Banner({
  variant,
  mark,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  actionsPlacement = 'end',
  actionLoading = false,
  className,
}: BannerProps) {
  const style = VARIANT[variant];
  const below = actionsPlacement === 'below';
  const primary =
    actionLabel && onAction ? (
      <Button
        variant="secondary"
        size={below ? 'sm' : 'md'}
        danger={variant === 'error'}
        loading={actionLoading}
        onPress={onAction}
        className={below ? undefined : 'w-full lg:w-auto'}
      >
        {actionLabel}
      </Button>
    ) : null;
  const secondary =
    secondaryActionLabel && onSecondaryAction ? (
      <Button
        variant="tertiary"
        size={below ? 'sm' : 'md'}
        onPress={onSecondaryAction}
        className={below ? undefined : 'w-full lg:w-auto'}
      >
        {secondaryActionLabel}
      </Button>
    ) : null;

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cx(
        'flex flex-col gap-s16 rounded-panel py-s16 pr-s16 pl-s24 lg:flex-row lg:items-center',
        style.box,
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-s16">
        {mark ?? <Icon name={style.name} size="lg" className={cx('mt-s4 lg:mt-0', style.icon)} />}
        <div className="flex min-w-0 flex-col gap-s4">
          <p className="text-body font-emphasis text-fg-primary">{title}</p>
          {description ? <p className="text-label text-fg-secondary">{description}</p> : null}
          {below && (primary || secondary) ? (
            <div className="mt-s12 flex flex-wrap items-center gap-s8">
              {primary}
              {secondary}
            </div>
          ) : null}
        </div>
      </div>
      {!below && (primary || secondary) ? (
        <div className="flex flex-col gap-s8 lg:flex-row">
          {primary}
          {secondary}
        </div>
      ) : null}
    </div>
  );
}
