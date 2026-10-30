import { InlineNotice } from '#/components/feedback/inline-notice.component.tsx';
import { AccountList } from '#/components/summary/account-list.component.tsx';
import { BalanceComposition } from '#/components/summary/balance-composition.component.tsx';
import { CompactFreeBalance } from '#/components/summary/compact-free-balance.component.tsx';
import type { FreeBalanceData } from '#/components/summary/free-balance.type.ts';
import { FreeBalanceHero } from '#/components/summary/free-balance-hero.component.tsx';
import { FreeBalanceSkeleton } from '#/components/summary/free-balance-skeleton.component.tsx';
import { OpenInvoiceList } from '#/components/summary/open-invoice-list.component.tsx';
import { ReviewLink } from '#/components/summary/review-link.component.tsx';

type FreeBalancePanelProps = {
  /** Ready-made data. Without it the panel shows its skeleton. */
  data?: FreeBalanceData;
  /** "full" is the glass panel; "compact" is the mobile "mini Livre" outside the Visão geral. */
  variant?: 'full' | 'compact';
  isHidden: boolean;
  onToggleHidden: () => void;
};

/**
 * The "Livre até o fim do mês" panel with its composition, the "Para revisar" row, accounts and
 * open invoices (components.md 2). Presentation only: it fetches nothing.
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
    <section aria-label="Livre até o fim do mês" className="glass flex flex-col gap-s16 p-s24">
      <FreeBalanceHero data={data} isHidden={isHidden} onToggleHidden={onToggleHidden} />
      {data.partialNote ? <InlineNotice>{data.partialNote}</InlineNotice> : null}
      <BalanceComposition lines={data.lines} />
      {data.review ? <ReviewLink {...data.review} /> : null}
      <AccountList title="Contas" items={data.accounts} />
      <OpenInvoiceList title="Faturas abertas" items={data.invoices} />
    </section>
  );
}
