import { BankCard, Button, InvoiceCard, OverflowMenu } from '@fincheck/ui';

import type { CardBlockData } from '#/features/accounts/account-list/types/account-list.type.ts';

type CardBlockProps = {
  data: CardBlockData;
  onViewInvoice: (cardId: string, month: string) => void;
  onCorrectInvoice: (cardId: string, month: string) => void;
  onOpenFuture: (cardId: string) => void;
  onMenuAction: (cardId: string, key: string) => void;
};

/** A credit card drawn in CSS with its invoice right below (screens.md, Contas e cartões). */
export function CardBlock({
  data,
  onViewInvoice,
  onCorrectInvoice,
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

  return (
    <div className="flex min-w-0 flex-col gap-s16">
      <BankCard
        theme={data.theme}
        nickname={data.nickname}
        last4={data.last4}
        dueLabel={data.dueLabel}
        bankName={data.bankName}
      />
      {invoice ? (
        <InvoiceCard
          status={invoice.status}
          totalCents={invoice.totalCents}
          dueLine={invoice.dueLine}
          cycleProgress={invoice.cycleProgress}
          installments={data.installments}
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
                  variant="tertiary"
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
        <div className="glass flex items-center justify-between gap-s12 p-s16 text-label text-fg-secondary">
          Ainda sem fatura neste cartão.
          {menu}
        </div>
      )}
    </div>
  );
}
