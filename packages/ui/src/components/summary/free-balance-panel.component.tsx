import { InlineNotice } from '#/components/feedback/inline-notice.component.tsx';
import { AccountList } from '#/components/summary/account-list.component.tsx';
import { BalanceComposition } from '#/components/summary/balance-composition.component.tsx';
import { CompactFreeBalance } from '#/components/summary/compact-free-balance.component.tsx';
import type { FreeBalanceData } from '#/components/summary/free-balance.type.ts';
import { FreeBalanceHero } from '#/components/summary/free-balance-hero.component.tsx';
import { FreeBalanceSkeleton } from '#/components/summary/free-balance-skeleton.component.tsx';
import { PANEL_LABELS, PANEL_SURFACE } from '#/components/summary/panel-labels.constant.ts';
import { cx } from '#/utils/class-names.util.ts';

type FreeBalancePanelProps = {
  /** Ready-made data. Without it the panel shows its skeleton. */
  data?: FreeBalanceData;
  /** "full" is the fixed desktop panel; "compact" is the mobile "mini" outside the Visão geral. */
  variant?: 'full' | 'compact';
  isHidden: boolean;
  onToggleHidden: () => void;
};

/**
 * The summary panel: the balance of the accounts, then receivable, payable and what is left at the
 * end of the month, then the first two accounts (components.md 2). It fits `100dvh - 32px` with
 * the longest mock data and tightens its spacing on low windows (`max-height: 700px`) instead of
 * scrolling. Presentation only: it fetches nothing.
 */
export function FreeBalancePanel({
  data,
  variant = 'full',
  isHidden,
  onToggleHidden,
}: FreeBalancePanelProps) {
  if (!data) {
    return (
      <FreeBalanceSkeleton variant={variant} isHidden={isHidden} onToggleHidden={onToggleHidden} />
    );
  }
  if (variant === 'compact') {
    return <CompactFreeBalance data={data} isHidden={isHidden} onToggleHidden={onToggleHidden} />;
  }

  return (
    <section
      aria-label={PANEL_LABELS.panel}
      className={cx(
        PANEL_SURFACE,
        'flex flex-col gap-s16 p-s24 [@media(max-height:700px)]:gap-s8 [@media(max-height:700px)]:p-s16',
      )}
    >
      <FreeBalanceHero
        cents={data.balanceCents}
        isHidden={isHidden}
        onToggleHidden={onToggleHidden}
      />
      {data.partialNote ? <InlineNotice>{data.partialNote}</InlineNotice> : null}
      <BalanceComposition data={data} />
      <AccountList title="Contas" items={data.accounts} moreHref={data.moreAccountsHref} />
    </section>
  );
}
