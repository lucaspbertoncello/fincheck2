import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';
import type { BillStatus, IconName } from '@fincheck/ui';

import type { FriendDebtRowData } from '#/features/bills/friend-list/types/friend-list.type.ts';
import { describeDueDate } from '#/features/bills/utils/describe-due-date.util.ts';

const STATUS: Record<Bill.Status, BillStatus> = {
  open: 'open',
  partial: 'partial',
  overdue: 'late',
  settled: 'settled',
};

const AGENDA_STATE = {
  open: 'upcoming',
  partial: 'partial',
  overdue: 'overdue',
  settled: 'settled',
} as const satisfies Record<Bill.Status, string>;

function lastPaymentDate(bill: Bill.Dto): string | null {
  return bill.payments.reduce<string | null>(
    (latest, payment) => (latest === null || payment.paidOn > latest ? payment.paidOn : latest),
    null,
  );
}

/**
 * One friend debt as the row of `BillRow`: the same status, badge and due text as on A pagar e
 * receber ("Dívida" when you owe, "Você pagou" when the friend owes you), with the payment the
 * "…" menu offers while something is left.
 */
export function presentFriendDebt(
  bill: Bill.Dto,
  today: string,
  categoryIcons: ReadonlyMap<string, IconName>,
): FriendDebtRowData {
  const receivable = bill.direction === 'receivable';
  const status = STATUS[bill.status];

  return {
    billId: bill.id,
    name: bill.description,
    person: bill.counterparty ?? '',
    icon: (bill.categoryId ? categoryIcons.get(bill.categoryId) : undefined) ?? 'debt',
    flow: receivable ? 'income' : 'expense',
    status,
    badges: [{ label: receivable ? 'Você pagou' : 'Dívida' }],
    dueText: describeDueDate(
      {
        dueOn: bill.dueOn,
        state: AGENDA_STATE[bill.status],
        settledOn: bill.status === 'settled' ? lastPaymentDate(bill) : null,
        flow: receivable ? 'in' : 'out',
      },
      today,
    ),
    amountCents: bill.amountCents,
    settledCents: status === 'partial' ? bill.paidCents : undefined,
    registerLabel:
      status === 'settled'
        ? undefined
        : receivable
          ? 'Registrar recebimento'
          : 'Registrar pagamento',
  };
}
