import type { BillBadge, BillStatus, IconName, RecurrenceFlow } from '@fincheck/ui';

import type { FriendStance } from '#/domain/bills/bill/rules/compute-friend-balances.rule.ts';

/** One friend debt, ready for `BillRow`. */
export type FriendDebtRowData = {
  billId: string;
  /** What the debt was for ("Ingresso do show"). */
  name: string;
  /** The person, for the delete confirmation. */
  person: string;
  icon: IconName;
  flow: RecurrenceFlow;
  status: BillStatus;
  badges: BillBadge[];
  /** "Vence 25/10, em 3 dias", "Recebido em 28/09". */
  dueText: string;
  amountCents: number;
  /** Partial only: what is paid or received so far. */
  settledCents: number | undefined;
  /** "Registrar recebimento" or "Registrar pagamento"; undefined on a settled debt. */
  registerLabel: string | undefined;
};

/** One person of the Amigos tab. */
export type FriendRowData = {
  key: string;
  name: string;
  stance: FriendStance;
  /** The size of the balance, without sign. */
  balanceCents: number;
  /** "te deve", "você deve" or "quite". */
  note: string;
  /** "2 dívidas em aberto", "1 em aberto · 1 quitada". */
  detail: string;
  debts: FriendDebtRowData[];
};

export type FriendListViewProps = {
  status: 'loading' | 'error' | 'empty' | 'ready';
  onRetry: () => void;
  /** The sentence of an action that failed (opening a debt, deleting it). */
  actionError: string | null;
  onDismissActionError: () => void;
  people: FriendRowData[];
  isOpen: (key: string) => boolean;
  onToggle: (key: string) => void;
  /** The person to bring into view (`?person=`), once. */
  scrollKey: string | null;
  /** "Nova dívida" of the tab. */
  onNewDebt: () => void;
  /** "Nova dívida" inside a person: the form with that person filled in. */
  onNewDebtFor: (name: string) => void;
  onDebtEdit: (billId: string) => void;
  onDebtDelete: (target: { billId: string; person: string }) => void;
  onDebtRegister: (billId: string) => void;
};
