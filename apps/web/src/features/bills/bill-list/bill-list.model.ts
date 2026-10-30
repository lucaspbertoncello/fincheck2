import type { BillBadge, BillStatus, IconName, RecurrenceFlow, TotalCardItem } from '@fincheck/ui';

/** One line of the agenda, ready for `BillRow`. */
export type BillRowModel = {
  /** The agenda item key (`bill:…`, `invoice:…`, `occurrence:…`). */
  key: string;
  name: string;
  icon: IconName;
  flow: RecurrenceFlow;
  status: BillStatus;
  badges: BillBadge[];
  dueText: string;
  /** Invoice with a payment found: "Pagamento encontrado no Bradesco". */
  foundPayment: string | undefined;
  amountCents: number;
  settledCents: number | undefined;
  /** False on settled rows: they have no button. */
  actionable: boolean;
  /** The id of a one-off bill that can be edited (tap the name); undefined on invoices, debts and recurrences. */
  editBillId: string | undefined;
};

/** A summary card ("A pagar", "A receber de amigos"). */
export type BillTotalModel = {
  label: string;
  totalCents: number;
  caption: string;
  items: TotalCardItem[];
};

export type BillSectionsModel = {
  thisMonth: BillRowModel[];
  openInvoices: BillRowModel[];
  receivable: BillRowModel[];
  undated: BillRowModel[];
  settled: BillRowModel[];
};

export type BillListViewProps = {
  status: 'loading' | 'error' | 'ready';
  onRetry: () => void;
  payable: BillTotalModel;
  friends: BillTotalModel;
  sections: BillSectionsModel;
  /** "Até 31/10". */
  thisMonthNote: string;
  /** "Bradesco vence 28/10, Nubank vence 06/11". */
  invoicesNote: string;
  /** "Quitadas em outubro". */
  settledTitle: string;
  /** Nothing open to pay or receive: shows the empty state. */
  isEmpty: boolean;
  emptyTitle: string;
  /** The sentence of an action that failed (settling an occurrence, linking a payment). */
  actionError: string | null;
  onDismissActionError: () => void;
  onRowAction: (key: string) => void;
  /** Tap on the name of an editable bill: opens the edit modal. */
  onRowEdit: (billId: string) => void;
  onNewDebt: () => void;
};
