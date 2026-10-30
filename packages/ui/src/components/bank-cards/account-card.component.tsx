import { BalanceCurve } from '#/components/bank-cards/balance-curve.component.tsx';
import { BankAvatar } from '#/components/bank-cards/bank-avatar.component.tsx';
import type { BankThemeKey } from '#/components/bank-cards/bank-theme.type.ts';
import { CardAction } from '#/components/bank-cards/card-action.component.tsx';
import { CardTag } from '#/components/bank-cards/card-tag.component.tsx';
import { Icon } from '#/components/icons/icon.component.tsx';
import { Money } from '#/components/money/money.component.tsx';
import { cx } from '#/utils/class-names.util.ts';

type AccountCardProps = {
  /** A bank theme, or "wallet" for the manual wallet. */
  theme: BankThemeKey | 'wallet';
  name: string;
  /** "Conta corrente". */
  subtitle: string;
  /** "Pluggy" or "Manual". */
  badge: string;
  balanceCents: number;
  /** Balance at the end of each day of the month, in cents. */
  curve: readonly number[];
  /** Text alternative of the curve. */
  curveLabel: string;
  /** "failed" paints the sync line as a warning and makes the action the primary one. */
  status: 'ok' | 'failed';
  /** "Sincronizado há 12 min", "Saldo manual" or "Falhou ontem às 18:40; o consentimento expira em 31/10". */
  statusLabel: string;
  /** Second line of a failure ("Sem transações novas do Bradesco até renovar."). */
  failureNote?: string;
  /** "Ajustar saldo", "Atualizar saldo" or "Renovar". */
  actionLabel: string;
  onAction: () => void;
  className?: string;
};

/** Account card of "Contas e cartões": bank, balance, month curve, sync state and action (3.5). */
export function AccountCard({
  theme,
  name,
  subtitle,
  badge,
  balanceCents,
  curve,
  curveLabel,
  status,
  statusLabel,
  failureNote,
  actionLabel,
  onAction,
  className,
}: AccountCardProps) {
  const failed = status === 'failed';

  return (
    <article aria-label={name} className={cx('glass flex flex-col gap-s12 p-s16', className)}>
      <header className="flex items-center gap-s12">
        <BankAvatar theme={theme} name={name} size={40} />
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="truncate font-title text-body font-emphasis text-fg-primary">{name}</h3>
          <p className="truncate text-meta text-fg-secondary">{subtitle}</p>
        </div>
        <CardTag tone={theme === 'wallet' ? 'neutral' : 'accent'}>{badge}</CardTag>
      </header>

      <p className="text-money-xl text-fg-primary max-lg:text-(length:--font-size-money-xl-mobile)">
        <Money cents={balanceCents} sign="auto" />
      </p>

      <BalanceCurve values={curve} label={curveLabel} />

      <footer
        className={cx(
          'flex gap-s12',
          failed ? 'flex-col lg:flex-row lg:items-center' : 'items-center justify-between',
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-s4">
          <p
            className={cx(
              'flex items-start gap-s8 text-meta',
              failed ? 'text-caution' : 'items-center text-fg-secondary',
            )}
          >
            <Icon name={failed ? 'warning' : 'sync'} size="xs" className="mt-px" />
            <span className="min-w-0">{statusLabel}</span>
          </p>
          {failed && failureNote ? (
            <p className="text-meta text-fg-secondary">{failureNote}</p>
          ) : null}
        </div>
        <CardAction variant={failed ? 'solid' : 'link'} onPress={onAction}>
          {actionLabel}
        </CardAction>
      </footer>
    </article>
  );
}
