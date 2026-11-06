import { BankCard } from '@fincheck/ui';
import type { ReactNode } from 'react';

import type { InvoiceCardData } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';

type InvoiceHeroProps = {
  /** The card of the invoice; a card-shaped skeleton while it loads. */
  card: InvoiceCardData | null;
  /** The summary box beside the card (below it on the phone), or its skeleton. */
  children: ReactNode;
};

/**
 * The top of the invoice page: the bank card (the same `BankCard` as in Contas e cartões, which is
 * the one that travels here from the list) and, beside it, the summary of the invoice. On the
 * phone the card comes first, full width.
 */
export function InvoiceHero({ card, children }: InvoiceHeroProps) {
  return (
    <div className="grid grid-cols-1 gap-s16 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:gap-s24">
      {card ? (
        <BankCard
          theme={card.theme}
          nickname={card.nickname}
          last4={card.last4}
          dueLabel={card.dueLabel}
          bankName={card.bankName}
          transitionName={card.transitionName}
          className="self-start"
        />
      ) : (
        <span
          aria-hidden="true"
          className="skeleton-pulse block aspect-[85.6/53.98] w-full self-start rounded-panel bg-track"
        />
      )}
      {children}
    </div>
  );
}
