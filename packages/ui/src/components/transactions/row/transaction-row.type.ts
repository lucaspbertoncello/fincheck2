import type { IconName } from '#/components/icons/icon-markup.constant.ts';

export type TransactionKind = 'expense' | 'income' | 'transfer';

export type TransactionMenuKey =
  'edit' | 'split' | 'ignore' | 'restore' | 'create-rule' | 'create-recurrence';

/** A transaction as its list row draws it. Everything is ready: the row computes nothing. */
export type TransactionRowData = {
  id: string;
  name: string;
  kind: TransactionKind;
  /** Signed integer cents: negative leaves the account, positive enters it. */
  amountCents: number;
  categoryIcon: IconName;
  /** "Sem categoria": dashed icon circle. */
  uncategorized?: boolean;
  /** "Delivery", "Transferência entre contas". Empty for a transaction with no category. */
  categoryName?: string;
  /** "Nubank, crédito". */
  accountLabel: string;
  /** Tag names without the "#": ["delivery"]. */
  tags?: readonly string[];
  installment?: { number: number; total: number };
  /** The bank authorized the purchase and has not posted it yet: the "Não lançada" chip, with its explanation. */
  pending?: boolean;
  toReview?: boolean;
  edited?: boolean;
  /** The bank changed the original after the user edited it. */
  bankChanged?: boolean;
  /** Number of parts when the transaction is split ("Dividida em 2"). */
  splitParts?: number;
  /** Neutralized in the month totals: transfer between own accounts, invoice payment. */
  outOfAccount?: boolean;
  ignored?: boolean;
  /** Already linked to an occurrence of a recurrence: the menu does not offer "Criar recorrência". */
  recurring?: boolean;
  /** The part of a friend's debt this payment settled, in cents ("Abateu R$ 150,00 da dívida com Rafa"). */
  debtPaidCents?: number;
  debtPerson?: string;
};
