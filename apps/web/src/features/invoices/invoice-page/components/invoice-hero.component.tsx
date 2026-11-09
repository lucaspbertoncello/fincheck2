import { BankCard } from '@fincheck/ui';
import type { ReactNode } from 'react';

import { INVOICE_GRID_CLASS } from '#/features/invoices/invoice-page/constants/invoice-grid-class.constant.ts';
import type { InvoiceCardData } from '#/features/invoices/invoice-page/types/invoice-page.type.ts';

type InvoiceHeroProps = {
  /** The card of the invoice; a card-shaped skeleton while it loads. */
  card: InvoiceCardData | null;
  /** The summary box beside the card (below it on the phone), or its skeleton. */
  children: ReactNode;
};

/**
 * The top of the invoice page: the bank card (the same `BankCard` as in Contas e cartões, which is
 * the one that travels here from the list) and, beside it, the summary of the invoice, on the grid of the
 * whole page (`INVOICE_GRID_CLASS`). On the phone the card comes first, full width.
 */
export function InvoiceHero({ card, children }: InvoiceHeroProps) {
  return (
    <div className={INVOICE_GRID_CLASS}>
      {card ? (
        <div className="w-full max-w-[24rem] self-start">
          <BankCard
            theme={card.theme}
            nickname={card.nickname}
            last4={card.last4}
            dueLabel={card.dueLabel}
            bankName={card.bankName}
            transitionName={card.transitionName}
          />
        </div>
      ) : (
        <span
          aria-hidden="true"
          className="skeleton-pulse block aspect-[85.6/53.98] w-full max-w-[24rem] self-start rounded-panel bg-track"
        />
      )}
      {children}
    </div>
  );
}
