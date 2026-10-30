import type { ReactNode } from 'react';

import { Button } from '#/components/buttons/index.ts';
import { Icon } from '#/components/icons/icon.component.tsx';
import type { IconName } from '#/components/icons/icon-markup.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

const VARIANT = {
  /** Old data, review notice. */
  warning: { box: 'bg-caution-weak', icon: 'text-caution', name: 'warning' },
  /** "Não deu para sincronizar o Bradesco". */
  error: { box: 'bg-loss-weak', icon: 'text-loss', name: 'danger' },
  /** "Criar regra". */
  suggestion: { box: 'bg-brand-weak', icon: 'text-brand', name: 'magic' },
} as const satisfies Record<string, { box: string; icon: string; name: IconName }>;

export type BannerVariant = keyof typeof VARIANT;

type BannerProps = {
  variant: BannerVariant;
  /** 16 px message. */
  title: string;
  /** 14 px line under it: the reason, the time of the attempts. */
  description?: ReactNode;
  /** Button on the right (below the text, full width, on the phone). */
  actionLabel?: string;
  onAction?: () => void;
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
  title,
  description,
  actionLabel,
  onAction,
  actionLoading = false,
  className,
}: BannerProps) {
  const style = VARIANT[variant];

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
        <Icon name={style.name} size="lg" className={cx('mt-s4 lg:mt-0', style.icon)} />
        <div className="flex min-w-0 flex-col gap-s4">
          <p className="text-body font-emphasis text-fg-primary">{title}</p>
          {description ? <p className="text-label text-fg-secondary">{description}</p> : null}
        </div>
      </div>
      {actionLabel && onAction ? (
        <Button
          variant="secondary"
          danger={variant === 'error'}
          loading={actionLoading}
          onPress={onAction}
          className="w-full lg:w-auto"
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
