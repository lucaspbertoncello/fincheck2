import { BankCard, Button, InvoiceCard, OverflowMenu } from '@fincheck/ui';

import type { CardBlockData } from '#/features/accounts/account-list/types/account-list.type.ts';

type CardBlockProps = {
  data: CardBlockData;
  onViewInvoice: (cardId: string, month: string) => void;
  onCorrectInvoice: (cardId: string, month: string) => void;
  onOpenInstallments: (cardId: string) => void;
  onOpenFuture: (cardId: string) => void;
  onMenuAction: (cardId: string, key: string) => void;
};

/** A credit card drawn in CSS with its invoice right below (screens.md, Contas e cartões). */
export function CardBlock({
  data,
  onViewInvoice,
  onCorrectInvoice,
  onOpenInstallments,
  onOpenFuture,
  onMenuAction,
}: CardBlockProps) {
  const { invoice } = data;
  const menu = (
    <OverflowMenu
      label={`Ações do cartão ${data.nickname}`}
      items={data.menuItems}
      onAction={(key) => onMenuAction(data.id, key)}
    />
  );

  const card = (
    <BankCard
      theme={data.theme}
      nickname={data.nickname}
      last4={data.last4}
      dueLabel={data.dueLabel}
      bankName={data.bankName}
      transitionName={data.transitionName}
    />
  );
  return (
    <div className="flex min-w-0 flex-col gap-s16">
      {invoice ? (
        // The card itself opens the invoice too (a mouse shortcut; "Ver fatura" is the button).
        <button
          type="button"
          tabIndex={-1}
          aria-label={`Ver fatura do cartão ${data.nickname}`}
          onClick={() => onViewInvoice(data.id, invoice.month)}
          className="block w-full cursor-pointer rounded-panel text-left"
        >
          {card}
        </button>
      ) : (
        card
      )}
      {invoice ? (
        <InvoiceCard
          className="flex-1"
          status={invoice.status}
          totalCents={invoice.totalCents}
          dueLine={invoice.dueLine}
          cycleProgress={invoice.cycleProgress}
          installments={data.installments}
          onOpenInstallments={() => onOpenInstallments(data.id)}
          onOpenFuture={() => onOpenFuture(data.id)}
          actions={
            <>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => onViewInvoice(data.id, invoice.month)}
              >
                Ver fatura
              </Button>
              {invoice.isEditable ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => onCorrectInvoice(data.id, invoice.month)}
                >
                  Corrigir valor
                </Button>
              ) : null}
              <span className="ml-auto">{menu}</span>
            </>
          }
        />
      ) : (
        <div className="glass flex flex-1 items-center justify-between gap-s12 p-s16 text-label text-fg-secondary">
          Ainda sem fatura neste cartão.
          {menu}
        </div>
      )}
    </div>
  );
}
